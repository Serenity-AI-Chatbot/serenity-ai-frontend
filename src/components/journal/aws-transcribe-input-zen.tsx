"use client"

import { Mic } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  type StartStreamTranscriptionCommandInput,
} from "@aws-sdk/client-transcribe-streaming"
import { useToast } from "@/hooks/use-toast"

interface AwsTranscribeInputProps {
  onStart?: () => void
  onStop?: (text: string) => void
  visualizerBars?: number
  className?: string
  isAiGenerating?: boolean
}

export function AwsTranscribeZenInput({ onStart, onStop, visualizerBars = 48, className, isAiGenerating = false }: AwsTranscribeInputProps) {
  const [submitted, setSubmitted] = useState(false)
  const [time, setTime] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [audioLevel, setAudioLevel] = useState(0) // Track audio level for visualization
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const transcribeClientRef = useRef<TranscribeStreamingClient | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const { toast } = useToast()

  const [silenceStartTime, setSilenceStartTime] = useState<number | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const silenceThresholdRef = useRef(0.05) // Threshold for silence detection
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [consecutiveLowAudioFrames, setConsecutiveLowAudioFrames] = useState(0)
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptRef = useRef("")
  // Add a new ref for the empty results timer
  const emptyResultsTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Replace the consecutive empty results state with a timestamp state
  const [lastEmptyResultTime, setLastEmptyResultTime] = useState<number | null>(null)

  // Add a new ref to track if auto-submit is in progress
  const autoSubmitInProgressRef = useRef(false)

  // Add this to track if we're in the process of shutting down
  const isShuttingDownRef = useRef(false)

  const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1"
  const AWS_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID
  const AWS_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY

  // Helper function to convert Float32Array to Int16Array for AWS Transcribe
  const convertFloat32ToInt16 = (buffer: Float32Array) => {
    const l = buffer.length
    const buf = new Int16Array(l)

    // Scale to near max level to ensure AWS can hear the audio
    for (let i = 0; i < l; i++) {
      // Scale to 16-bit range: -32768 to 32767, with stronger volume
      const s = Math.max(-0.99, Math.min(0.99, buffer[i]))
      // Use full 16-bit range for better sensitivity
      buf[i] = Math.round(s * 32767)
    }

    return buf
  }

  // Helper to resample audio if needed
  const resampleAudio = (
    audioData: Float32Array,
    originalSampleRate: number,
    targetSampleRate: number,
  ): Float32Array => {
    if (originalSampleRate === targetSampleRate) {
      return audioData
    }

    const ratio = targetSampleRate / originalSampleRate
    const newLength = Math.round(audioData.length * ratio)
    const result = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const position = i / ratio
      const index = Math.floor(position)
      const fraction = position - index

      if (index >= audioData.length - 1) {
        result[i] = audioData[audioData.length - 1]
      } else {
        // Linear interpolation
        result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
      }
    }

    return result
  }

  // Force immediate cleanup - for emergency use
  const forceImmediateCleanup = () => {
    console.log("FORCE IMMEDIATE CLEANUP")
    
    // Stop all tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    // Disconnect audio nodes
    if (processorRef.current) {
      try {
        processorRef.current.onaudioprocess = null
        processorRef.current.disconnect()
      } catch (e) {}
    }
    
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch (e) {}
    }
    
    // Destroy transcribe client
    if (transcribeClientRef.current) {
      try {
        transcribeClientRef.current.destroy()
      } catch (e) {}
      transcribeClientRef.current = null
    }
    
    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch (e) {}
      audioContextRef.current = null
    }
    
    // Clear all timeouts
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
    if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current)
    if (emptyResultsTimerRef.current) clearTimeout(emptyResultsTimerRef.current)
    
    // Reset all refs and state
    silenceTimeoutRef.current = null
    autoSubmitTimeoutRef.current = null
    emptyResultsTimerRef.current = null
    streamRef.current = null
    sourceNodeRef.current = null
    processorRef.current = null
    audioChunksRef.current = []
    autoSubmitInProgressRef.current = false
    isShuttingDownRef.current = false
    
    // Reset UI state
    setIsRecording(false)
    setIsSpeaking(false)
    setSilenceStartTime(null)
    setLastEmptyResultTime(null)
    setConsecutiveLowAudioFrames(0)
    setSubmitted(false)
    setStatusMessage("")
    setTranscript("")
  }

  // Add an emergency stop timeout in case regular methods fail
  // This will absolutely ensure the recording stops eventually
  const setupEmergencyTimeout = () => {
    return setTimeout(() => {
      if (isRecording) {
        console.log("EMERGENCY STOP: Recording still active after max duration")
        forceImmediateCleanup()
      }
    }, 15000) // 15 seconds max
  }

  // Start real-time transcription using a direct audio feed
  const startRecording = async () => {
    // First check if we're already shutting down or recording
    if (isShuttingDownRef.current || isRecording) {
      console.log("Cannot start recording while already recording or shutting down")
      return
    }
    
    // Don't start recording if AI is generating a response
    if (isAiGenerating) {
      console.log("Cannot start recording while AI is generating a response")
      toast({
        title: "Wait for AI",
        description: "Please wait until the AI response finishes generating.",
        variant: "default",
      })
      return
    }

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      toast({
        title: "Error",
        description: "AWS credentials are not set.",
        variant: "destructive",
      })
      return
    }

    try {
      setStatusMessage("Getting microphone access...")

      // First set recording state so it's available to the generator
      setIsRecording(true)
      setSubmitted(true)

      // Setup emergency timeout
      const emergencyTimeoutId = setupEmergencyTimeout()

      // Wait a moment for state to stabilize
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Request user media
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Create source node from the microphone stream
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current)

      // Create a ScriptProcessorNode for processing audio data
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // In a production app, AudioWorkletNode would be better but needs more setup
      const bufferSize = 2048 // Smaller buffer size
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1)

      // Get actual sample rate - browser might not honor our requested rate
      const actualSampleRate = audioContextRef.current.sampleRate
      console.log(`Actual sample rate from AudioContext: ${actualSampleRate}Hz`)

      // Flag to determine if we need to resample
      const needsResampling = Math.abs(actualSampleRate - 16000) > 100
      console.log(`Resampling needed: ${needsResampling}`)

      // Connect the nodes
      sourceNodeRef.current.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)

      // Reset state
      audioChunksRef.current = []
      setTranscript("")
      setStatusMessage("Recording and transcribing...")
      if (onStart) onStart()

      // In the startRecording function, add this line after other state resets
      setLastEmptyResultTime(null)
      if (emptyResultsTimerRef.current) {
        clearTimeout(emptyResultsTimerRef.current)
        emptyResultsTimerRef.current = null
      }

      // Create the transcribe client
      transcribeClientRef.current = new TranscribeStreamingClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      })

      // Collect audio data via ScriptProcessorNode
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)

        // Make a copy of the audio data
        const audioChunk = new Float32Array(inputData.length)
        audioChunk.set(inputData)

        // Resample if needed to match AWS Transcribe's expected 16kHz
        const processedChunk = needsResampling ? resampleAudio(audioChunk, actualSampleRate, 16000) : audioChunk

        // Normalize and boost audio - improves speech recognition
        let maxSample = 0
        let sumSquared = 0

        for (let i = 0; i < processedChunk.length; i++) {
          const sample = Math.abs(processedChunk[i])
          maxSample = Math.max(maxSample, sample)
          sumSquared += processedChunk[i] * processedChunk[i]
        }

        // Calculate RMS amplitude
        const rms = Math.sqrt(sumSquared / processedChunk.length)

        // Update audio level meter for visualization
        setAudioLevel(Math.min(rms * 5, 1)) // Scale for better visual feedback

        // Improved silence detection for auto-submission
        // Higher threshold to avoid background noise triggering
        const silenceThreshold = 0.08 // Increased from 0.05 to better filter background noise

        // Skip audio processing if AI is generating or we're in auto-submit process
        if (!isAiGenerating && !autoSubmitInProgressRef.current) {
          if (rms > silenceThreshold) {
            // User is speaking
            setIsSpeaking(true)
            setSilenceStartTime(null)
            setConsecutiveLowAudioFrames(0)

            // Clear any existing timeouts
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current)
              silenceTimeoutRef.current = null
            }
            if (autoSubmitTimeoutRef.current) {
              clearTimeout(autoSubmitTimeoutRef.current)
              autoSubmitTimeoutRef.current = null
            }

            // Update the last transcript reference
            lastTranscriptRef.current = transcript
          } else {
            // Audio level is low - could be silence or background noise
            // Count consecutive low audio frames
            setConsecutiveLowAudioFrames((prev) => {
              const newCount = prev + 1

              // If we have consistent low audio for about 3 seconds (60 frames at 50ms intervals)
              // AND we have a transcript, auto-submit
              if (newCount >= 60 && lastTranscriptRef.current.trim().length > 0 && !autoSubmitTimeoutRef.current) {
                console.log("Detected consistent low audio for 3 seconds, auto-submitting")

                // Prevent multiple submissions
                autoSubmitInProgressRef.current = true

                autoSubmitTimeoutRef.current = setTimeout(() => {
                  const finalTranscript = lastTranscriptRef.current.trim()
                  console.log("Auto-submitting after consistent low audio:", finalTranscript)

                  if (finalTranscript.length > 0 && !isShuttingDownRef.current) {
                    // Set shutdown flag immediately to prevent further processing
                    isShuttingDownRef.current = true
                    autoSubmitInProgressRef.current = true
                    
                    // Force immediate termination of all audio processing
                    // First destroy transcribe client
                    if (transcribeClientRef.current) {
                      try {
                        transcribeClientRef.current.destroy()
                        transcribeClientRef.current = null
                      } catch (e) {
                        console.warn("Error destroying transcribe client:", e)
                      }
                    }
                    
                    // Force stop media tracks
                    if (streamRef.current) {
                      try {
                        streamRef.current.getTracks().forEach(track => track.stop())
                        streamRef.current = null
                      } catch (e) {
                        console.warn("Error stopping tracks:", e)
                      }
                    }
                    
                    // Call onStop immediately
                    if (onStop) {
                      onStop(finalTranscript)
                    }
                    
                    // Clean up all resources
                    cleanupResources()
                    
                    // Reset component state to allow new recording
                    setTimeout(() => {
                      resetAndPrepareForNextRecording()
                    }, 250)
                  }

                  autoSubmitTimeoutRef.current = null
                }, 150)
              }

              return newCount
            })

            // Also keep the original silence detection logic as a backup
            if (isSpeaking) {
              if (silenceStartTime === null) {
                setSilenceStartTime(Date.now())
              } else {
                // Check if silence has lasted long enough to auto-submit
                const silenceDuration = Date.now() - silenceStartTime

                // If silence for 2 seconds and we have transcript, schedule auto-submit
                if (silenceDuration > 2000 && transcript.trim().length > 0 && !silenceTimeoutRef.current && !autoSubmitInProgressRef.current) {
                  console.log("Silence detected, scheduling auto-submit")
                  
                  // Prevent multiple submissions
                  autoSubmitInProgressRef.current = true
                  
                  silenceTimeoutRef.current = setTimeout(() => {
                    console.log("Auto-submitting after silence")
                    // Only auto-submit if we're still recording, have transcript, and not already shutting down
                    if (isRecording && transcript.trim().length > 0 && !isShuttingDownRef.current) {
                      const finalTranscript = transcript.trim()
                      console.log("Auto-submitting transcript:", finalTranscript)
                      
                      // Set shutdown flag immediately to prevent further processing
                      isShuttingDownRef.current = true
                      
                      // Stop recording
                      stopRecording()
                      
                      // Ensure onStop is called with the current transcript
                      if (onStop) {
                        setTimeout(() => {
                          onStop(finalTranscript)
                        }, 100)
                      }
                    }
                    silenceTimeoutRef.current = null
                  }, 150) // Faster response time
                }
              }
            }
          }
        } else if (isAiGenerating) {
          // If AI is generating, we should stop processing audio actively
          // but still collect the chunks for streaming
        }

        // Apply strong gain - AWS Transcribe needs loud, clear audio
        // Always boost audio significantly to ensure detection
        const targetRMS = 0.3 // Higher target RMS level for better detection
        const gain = Math.min(Math.max(targetRMS / Math.max(rms, 0.01), 2.0), 10.0) // Min gain 2x, Max gain 10x

        // Apply gain to all samples
        for (let i = 0; i < processedChunk.length; i++) {
          processedChunk[i] *= gain

          // Apply soft clipping to prevent harsh distortion
          if (processedChunk[i] > 0.9) {
            processedChunk[i] = 0.9 + 0.1 * Math.tanh((processedChunk[i] - 0.9) * 10)
          } else if (processedChunk[i] < -0.9) {
            processedChunk[i] = -0.9 - 0.1 * Math.tanh((-processedChunk[i] - 0.9) * 10)
          }
        }

        // Store processed chunk for streaming
        audioChunksRef.current.push(processedChunk)
      }

      // Create audio stream generator
      async function* audioGenerator() {
        const chunkSize = 1024 // Smaller chunks for better streaming
        let chunkCounter = 0
        let lastLogTime = Date.now()
        let lastChunkTime = Date.now()

        // Track recording state locally
        const startTime = Date.now()
        const shouldRunUntil = startTime + 18000 // Run for at least 18 seconds
        let isActive = true

        try {
          // Make a local copy of the recording state variable
          // This will make the generator independent of React state updates
          console.log("Starting audio generator, will run for at least 18 seconds")

          // Check recording state periodically but don't rely on it exclusively
          const checkRecordingInterval = setInterval(() => {
            // Only stop from external state after minimum time period
            if (!isRecording && Date.now() > shouldRunUntil) {
              isActive = false
              console.log("Generator detected recording intentionally stopped")
            }
          }, 100)

          while (isActive || Date.now() < shouldRunUntil) {
            // Ensure we run for at least the minimum time regardless of state
            if (Date.now() < shouldRunUntil && !isActive) {
              console.log("Continuing to run generator despite state change")
              isActive = true
            }

            // Wait for audio data to be processed
            await new Promise((resolve) => setTimeout(resolve, 50))

            // Check if we have new audio chunks
            if (audioChunksRef.current.length > 0) {
              lastChunkTime = Date.now()
              // Process all available chunks
              while (audioChunksRef.current.length > 0) {
                const nextChunk = audioChunksRef.current.shift()!
                const int16Data = convertFloat32ToInt16(nextChunk)

                // Send in small chunks to avoid overwhelming AWS
                for (let offset = 0; offset < int16Data.length; offset += chunkSize) {
                  const end = Math.min(offset + chunkSize, int16Data.length)
                  const chunk = int16Data.slice(offset, end)

                  // Log periodically to avoid console spam
                  chunkCounter++
                  if (chunkCounter % 10 === 0 || Date.now() - lastLogTime > 1000) {
                    console.log(`Sending audio chunk ${chunkCounter}: ${chunk.length} samples`)
                    lastLogTime = Date.now()
                  }

                  // Yield the chunk
                  yield {
                    AudioEvent: {
                      AudioChunk: new Uint8Array(chunk.buffer),
                    },
                  }

                  // Small delay between chunks
                  await new Promise((resolve) => setTimeout(resolve, 20))
                }
              }
            } else if (Date.now() - lastChunkTime > 500) {
              // Send a small "keepalive" audio chunk with minimal noise to prevent
              // AWS from disconnecting due to silence
              lastChunkTime = Date.now()

              // Create a small silent chunk with tiny amount of noise
              const silentChunk = new Float32Array(160) // 10ms at 16kHz
              for (let i = 0; i < silentChunk.length; i++) {
                // Add a tiny bit of noise so it's not pure silence
                silentChunk[i] = (Math.random() - 0.5) * 0.001
              }

              const int16Data = convertFloat32ToInt16(silentChunk)

              if (chunkCounter % 20 === 0) {
                console.log("Sending keepalive audio chunk")
              }

              chunkCounter++

              yield {
                AudioEvent: {
                  AudioChunk: new Uint8Array(int16Data.buffer),
                },
              }
            }
          }

          console.log("Audio stream ended")
          clearInterval(checkRecordingInterval)

          // Send one final set of audio to ensure AWS has something to process
          const finalSilentChunk = new Float32Array(1600)
          for (let i = 0; i < finalSilentChunk.length; i++) {
            // Add a tiny bit of noise
            finalSilentChunk[i] = (Math.random() - 0.5) * 0.0005
          }

          console.log("Sending final audio chunk")
          yield {
            AudioEvent: {
              AudioChunk: new Uint8Array(convertFloat32ToInt16(finalSilentChunk).buffer),
            },
          }

          // Give AWS time to process the audio
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          console.error("Audio streaming error:", error)
        } finally {
          console.log("Sending empty chunk to signal end of audio")
          // Final yield to signal completion
          yield {
            AudioEvent: {
              AudioChunk: new Uint8Array(0),
            },
          }
        }
      }

      // Configure the transcription request
      const transcribeParams: StartStreamTranscriptionCommandInput = {
        LanguageCode: "en-US",
        MediaEncoding: "pcm",
        MediaSampleRateHertz: 16000, // AWS expects 16kHz PCM
        AudioStream: audioGenerator(),
        // Make sure we get all possible results
        EnablePartialResultsStabilization: true,
        PartialResultsStability: "medium", // Less strict matching
        // Disable vocabulary filters to maximize detection
        VocabularyFilterMethod: undefined,
        VocabularyFilterName: undefined,
        // Critical: Set to false to get all audio processed
        ShowSpeakerLabel: false,
      }

      console.log("Starting live transcription...")

      // Start transcription
      const command = new StartStreamTranscriptionCommand(transcribeParams)
      const response = await transcribeClientRef.current.send(command)

      console.log("Transcribe session established")

      // Process transcription results
      const stream = response.TranscriptResultStream
      if (stream) {
        ;(async () => {
          let finalTranscript = ""
          let noResultCounter = 0
          let lastTranscriptTime = Date.now()
          let consistentEmptyResultsStartTime: number | null = null

          try {
            console.log("Starting to process transcription stream")
            for await (const event of stream) {
              // Skip processing if we're shutting down
              if (isShuttingDownRef.current) {
                console.log("Skipping event processing - shutdown in progress")
                continue
              }

              if (event?.TranscriptEvent?.Transcript) {
                console.log("Received transcription event:", JSON.stringify(event, null, 2))

                // Check if results array is empty
                if (
                  !event.TranscriptEvent.Transcript.Results ||
                  event.TranscriptEvent.Transcript.Results.length === 0
                ) {
                  // Track consistent empty results
                  if (consistentEmptyResultsStartTime === null) {
                    consistentEmptyResultsStartTime = Date.now()
                    console.log("First empty result detected, starting empty results timer")
                  } else {
                    const emptyDuration = Date.now() - consistentEmptyResultsStartTime
                    const timeSinceLastTranscript = Date.now() - lastTranscriptTime

                    // If we have consistent empty results for over 1.5 seconds AND
                    // it's been over 1 second since we got actual transcript content
                    if (
                      emptyDuration > 1500 && 
                      timeSinceLastTranscript > 1000 &&
                      finalTranscript.trim().length > 0 && 
                      !emptyResultsTimerRef.current &&
                      !autoSubmitInProgressRef.current &&
                      !isShuttingDownRef.current
                    ) {
                      console.log(`Empty results for ${emptyDuration}ms, scheduling auto-submit`)
                      
                      // Prevent multiple submissions
                      autoSubmitInProgressRef.current = true
                      
                      // Schedule auto-submit
                      emptyResultsTimerRef.current = setTimeout(() => {
                        console.log("Auto-submitting after empty results")
                        
                        if (isRecording && finalTranscript.trim().length > 0 && !isShuttingDownRef.current) {
                          const textToSubmit = finalTranscript.trim()
                          console.log("Auto-submitting transcript:", textToSubmit)
                          
                          // Set shutdown flag immediately to prevent further processing
                          isShuttingDownRef.current = true
                          
                          // Force destroy transcribe client immediately
                          if (transcribeClientRef.current) {
                            try {
                              transcribeClientRef.current.destroy()
                              transcribeClientRef.current = null
                            } catch (e) {
                              console.warn("Error destroying transcribe client:", e)
                            }
                          }

                          // Force stop all media tracks immediately
                          if (streamRef.current) {
                            try {
                              streamRef.current.getTracks().forEach(track => track.stop())
                              streamRef.current = null
                            } catch (e) {
                              console.warn("Error stopping media tracks:", e)
                            }
                          }
                          
                          // Call onStop with the transcript
                          if (onStop) {
                            // Call immediately to avoid delay
                            onStop(textToSubmit)
                          }
                          
                          // Clean up resources
                          cleanupResources()
                          
                          // Reset for next recording
                          setTimeout(() => {
                            resetAndPrepareForNextRecording()
                          }, 250)
                        }
                        
                        emptyResultsTimerRef.current = null
                      }, 50) // Almost immediately
                    }
                  }
                } else {
                  // We got actual results, update the last transcript time
                  lastTranscriptTime = Date.now()
                  
                  // Only reset empty results timer if we're not in auto-submit process
                  if (!autoSubmitInProgressRef.current && !isShuttingDownRef.current) {
                    consistentEmptyResultsStartTime = null
                    
                    if (emptyResultsTimerRef.current) {
                      clearTimeout(emptyResultsTimerRef.current)
                      emptyResultsTimerRef.current = null
                    }
                  }

                  for (const result of event.TranscriptEvent.Transcript.Results || []) {
                    if (result?.Alternatives && result.Alternatives.length > 0 && result.Alternatives[0].Transcript) {
                      const text = result.Alternatives[0].Transcript
                      console.log(`Received text: "${text}", IsPartial: ${result.IsPartial}`)

                      // Handle partial vs final results
                      if (!result.IsPartial) {
                        finalTranscript += text + " "
                        setTranscript(finalTranscript.trim())
                        // Update the last transcript reference for other auto-submit methods
                        lastTranscriptRef.current = finalTranscript.trim()
                      } else {
                        setTranscript(finalTranscript + text)
                      }
                    }
                  }
                }
              } else {
                // Count empty events for debugging
                noResultCounter++
                if (noResultCounter % 5 === 0) {
                  console.log(`Received ${noResultCounter} events with no transcription`)
                }
              }
            }
            console.log("Transcription stream completed")

            // Handle end of transcription
            if (!isRecording) {
              if (finalTranscript.trim()) {
                console.log("Final transcript:", finalTranscript.trim())
                if (onStop && !isShuttingDownRef.current) {
                  onStop(finalTranscript.trim())
                  // Mark as shutting down
                  isShuttingDownRef.current = true
                }
              } else {
                console.log("No transcription results")
                // toast({
                //   title: "No speech detected",
                //   description: "Try speaking louder or check your microphone.",
                //   variant: "destructive",
                // })
                if (onStop && !isShuttingDownRef.current) {
                  onStop("No speech detected")
                  // Mark as shutting down
                  isShuttingDownRef.current = true
                }
              }

              // Reset for next recording
              setTimeout(() => {
                resetAndPrepareForNextRecording()
              }, 250)
            }
          } catch (error) {
            console.error("Error processing transcription stream:", error)

            // If we have final transcript, still use it
            if (finalTranscript.trim() && !isShuttingDownRef.current) {
              console.log("Using existing transcript despite error")
              if (onStop) {
                onStop(finalTranscript.trim())
                // Mark as shutting down
                isShuttingDownRef.current = true
                
                // Reset for next recording
                setTimeout(() => {
                  resetAndPrepareForNextRecording()
                }, 250)
              }
            }
          }
        })()
      }

      // Set a maximum recording time and clear emergency timeout when done
      setTimeout(() => {
        if (isRecording) {
          console.log("Auto-stopping recording after timeout")
          stopRecording()
        }
        clearTimeout(emergencyTimeoutId)
      }, 20000) // 20 seconds max
    } catch (error) {
      console.error("Error setting up transcription:", error)
      setStatusMessage("")
      toast({
        title: "Setup Error",
        description: "Could not initialize transcription. Please try again.",
        variant: "destructive",
      })
      cleanupResources()
      setSubmitted(false)
      setIsRecording(false)
    }
  }

  // Modify the cleanup resources to separate UI reset from audio cleanup
  const cleanupResources = () => {
    console.log("Cleaning up resources")

    // Reset flags
    autoSubmitInProgressRef.current = false
    isShuttingDownRef.current = false

    // First clean up all audio resources
    // Stop all tracks first
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop())
      } catch (e) {
        console.warn("Error stopping tracks:", e)
      }
      streamRef.current = null
    }

    // Disconnect audio nodes
    if (processorRef.current) {
      try {
        processorRef.current.onaudioprocess = null
        processorRef.current.disconnect()
      } catch (e) {
        console.warn("Error disconnecting processor:", e)
      }
      processorRef.current = null
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch (e) {
        console.warn("Error disconnecting source:", e)
      }
      sourceNodeRef.current = null
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close()
      } catch (e) {
        console.warn("Error closing audio context:", e)
      }
      audioContextRef.current = null
    }

    // Destroy transcribe client
    if (transcribeClientRef.current) {
      try {
        transcribeClientRef.current.destroy()
      } catch (e) {
        console.warn("Error destroying transcribe client:", e)
      }
      transcribeClientRef.current = null
    }

    // Clear all timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current)
      autoSubmitTimeoutRef.current = null
    }
    if (emptyResultsTimerRef.current) {
      clearTimeout(emptyResultsTimerRef.current)
      emptyResultsTimerRef.current = null
    }

    // Set state to prevent race conditions
    setIsRecording(false)
    setIsSpeaking(false)
    setSilenceStartTime(null)
    setLastEmptyResultTime(null)
    setConsecutiveLowAudioFrames(0)
    
    // Reset transcript and audio chunks
    audioChunksRef.current = []

    // Reset UI state with a slight delay to avoid flicker
    setTimeout(() => {
      setSubmitted(false)
      setStatusMessage("")
    }, 100)
  }

  // Modify the stopRecording function to handle auto-reset
  const stopRecording = () => {
    // Prevent double-stopping
    if (isShuttingDownRef.current) {
      console.log("Already shutting down, ignoring duplicate stop request")
      return
    }

    console.log("Stopping recording")
    isShuttingDownRef.current = true
    setIsRecording(false)
    setStatusMessage("Processing final results...")

    // Store the current transcript for submission
    const currentTranscript = transcript.trim()

    // Force immediate stop for all audio inputs
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop())
      } catch (e) {
        console.warn("Error stopping tracks:", e)
      }
    }

    // Immediately disconnect audio nodes
    if (processorRef.current) {
      try {
        // First remove the audio processor callback to prevent more audio processing
        processorRef.current.onaudioprocess = null
        processorRef.current.disconnect()
      } catch (e) {
        console.warn("Error disconnecting processor:", e)
      }
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch (e) {
        console.warn("Error disconnecting source:", e)
      }
    }

    // Force terminate the transcribe client
    if (transcribeClientRef.current) {
      try {
        transcribeClientRef.current.destroy()
      } catch (e) {
        console.warn("Error destroying transcribe client:", e)
      }
      transcribeClientRef.current = null
    }

    // Clean up remaining resources with a short delay
    setTimeout(() => {
      console.log("Cleanup delay complete")
      cleanupResources()
    }, 150) // Quicker for better responsiveness
    
    // Return the transcript so it can be used by callers
    return currentTranscript
  }

  // Add the reset function if it doesn't exist already
  const resetAndPrepareForNextRecording = () => {
    console.log("Resetting component for next recording")
    // Reset flags
    isShuttingDownRef.current = false
    autoSubmitInProgressRef.current = false
    
    // Reset UI state
    setSubmitted(false)
    setTranscript("")
    setStatusMessage("")
    
    // Reset detection state
    setIsSpeaking(false)
    setSilenceStartTime(null)
    setLastEmptyResultTime(null)
    setConsecutiveLowAudioFrames(0)
  }

  // Update handleClick to use the resetAndPrepareForNextRecording function
  const handleClick = useCallback(() => {
    // Don't allow starting recording if AI is generating
    if (isAiGenerating) {
      console.log("Cannot start recording while AI is generating a response")
      toast({
        title: "Wait for AI",
        description: "Please wait until the AI response finishes generating.",
        variant: "default",
      })
      return
    }

    // Prevent multiple clicks during shutdown
    if (isShuttingDownRef.current) {
      console.log("Cannot perform action while shutting down")
      return
    }

    // In the handleClick function, add this to reset the timer
    if (!submitted) {
      // Starting a new recording
      setTranscript("") // Clear any previous transcript
      setLastEmptyResultTime(null)
      if (emptyResultsTimerRef.current) {
        clearTimeout(emptyResultsTimerRef.current)
        emptyResultsTimerRef.current = null
      }
      startRecording()
    } else {
      // Stopping current recording - first save transcript
      const currentTranscript = transcript.trim()
      
      // Mark as shutting down to prevent duplicate clicks
      isShuttingDownRef.current = true
      
      // Call onStop immediately if we have content
      if (currentTranscript.length > 0 && onStop) {
        onStop(currentTranscript)
      }
      
      // Force terminate the transcribe client
      if (transcribeClientRef.current) {
        try {
          transcribeClientRef.current.destroy()
          transcribeClientRef.current = null
        } catch (e) {
          console.warn("Error destroying transcribe client:", e)
        }
      }
      
      // Force stop media tracks
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        } catch (e) {
          console.warn("Error stopping tracks:", e)
        }
      }
      
      // Clean up resources
      cleanupResources()
      
      // Reset for next recording
      setTimeout(() => {
        resetAndPrepareForNextRecording()
      }, 250)
    }
  }, [submitted, transcript, isAiGenerating, onStop]);
  
  // Update the AI generation effect to use resetAndPrepareForNextRecording
  useEffect(() => {
    if (isAiGenerating && isRecording) {
      console.log("AI is generating response, stopping recording")
      const currentTranscript = transcript.trim()
      
      // Mark as shutting down
      isShuttingDownRef.current = true
      
      // Force immediate cleanup
      forceImmediateCleanup()
      
      // Only submit if we have content
      if (currentTranscript.length > 0 && onStop) {
        onStop(currentTranscript)
      }
      
      // Reset for next recording after AI is done
      setTimeout(() => {
        resetAndPrepareForNextRecording()
      }, 250)
    }
  }, [isAiGenerating, isRecording, transcript, onStop]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (submitted) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1)
      }, 1000)
    } else {
      setTime(0) // Reset timer when stopped
    }

    return () => clearInterval(intervalId)
  }, [submitted])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (isRecording) {
        cleanupResources()
      }
    }
  }, [isRecording])

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group w-16 h-16 rounded-xl flex items-center justify-center transition-colors",
            isAiGenerating ? "opacity-50 cursor-not-allowed" : "",
            isShuttingDownRef.current ? "opacity-50 cursor-not-allowed" : "",
            submitted ? "bg-none" : "bg-none hover:bg-black/10 dark:hover:bg-white/10",
          )}
          type="button"
          onClick={handleClick}
          disabled={isAiGenerating || isShuttingDownRef.current}
        >
          {submitted ? (
            <div
              className="w-6 h-6 rounded-sm animate-spin bg-black dark:bg-white cursor-pointer pointer-events-auto"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="w-6 h-6 text-black/70 dark:text-white/70" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300",
            submitted ? "text-black/70 dark:text-white/70" : "text-black/30 dark:text-white/30",
          )}
        >
          {formatTime(time)}
        </span>

        {/* Audio level meter */}
        {submitted && (
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100"
              style={{
                width: `${audioLevel * 100}%`,
                backgroundColor: audioLevel > 0.6 ? "green" : audioLevel > 0.2 ? "yellow" : "red",
              }}
            />
          </div>
        )}

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                submitted ? "bg-black/50 dark:bg-white/50 animate-pulse" : "bg-black/10 dark:bg-white/10 h-1",
              )}
              style={
                submitted
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-black/70 dark:text-white/70">
          {submitted ? statusMessage || "Listening with AWS Transcribe..." : "Click to speak"}
        </p>

        <p className="mt-4 text-sm text-center text-black/70 dark:text-white/70 max-w-md">
          {transcript ||
            (submitted ? "Speak now - talk clearly and directly into the microphone" : "Click mic to start")}
        </p>
      </div>
    </div>
  )
}

