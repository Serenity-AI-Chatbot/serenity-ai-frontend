import { Mic } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  StartStreamTranscriptionCommandInput
} from "@aws-sdk/client-transcribe-streaming";
import { useToast } from "@/hooks/use-toast";

interface AwsTranscribeInputProps {
  onStart?: () => void;
  onStop?: (text: string) => void;
  visualizerBars?: number;
  className?: string;
}

export function AwsTranscribeInput({
  onStart,
  onStop,
  visualizerBars = 48,
  className,
}: AwsTranscribeInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [audioLevel, setAudioLevel] = useState(0); // Track audio level for visualization
  const [noSpeechTimeout, setNoSpeechTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastAudioLevel, setLastAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcribeClientRef = useRef<TranscribeStreamingClient | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const { toast } = useToast();

  const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
  const AWS_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

  // Helper function to convert Float32Array to Int16Array for AWS Transcribe
  const convertFloat32ToInt16 = (buffer: Float32Array) => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    
    // Scale to near max level to ensure AWS can hear the audio
    for (let i = 0; i < l; i++) {
      // Scale to 16-bit range: -32768 to 32767, with stronger volume
      const s = Math.max(-0.99, Math.min(0.99, buffer[i]));
      // Use full 16-bit range for better sensitivity
      buf[i] = Math.round(s * 32767);
    }
    
    return buf;
  };
  
  // Helper to resample audio if needed
  const resampleAudio = (audioData: Float32Array, originalSampleRate: number, targetSampleRate: number): Float32Array => {
    if (originalSampleRate === targetSampleRate) {
      return audioData;
    }
    
    const ratio = targetSampleRate / originalSampleRate;
    const newLength = Math.round(audioData.length * ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const position = i / ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      
      if (index >= audioData.length - 1) {
        result[i] = audioData[audioData.length - 1];
      } else {
        // Linear interpolation
        result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
      }
    }
    
    return result;
  };

  // Helper function to check for silence
  const checkForSilence = useCallback(() => {
    if (lastAudioLevel < 0.05) { // Very low audio level threshold
      if (transcript.trim() === "") {
        console.log("No speech detected, stopping recording");
        stopRecording();
        toast({
          title: "No speech detected",
          description: "Please try speaking again.",
          variant: "destructive",
        });
      } else {
        console.log("Has transcript but silence detected, stopping recording");
        stopRecording();
        if (onStop) onStop(transcript);
      }
    }
  }, [lastAudioLevel, transcript, onStop]);

  // Start real-time transcription using a direct audio feed
  const startRecording = async () => {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      toast({
        title: "Error",
        description: "AWS credentials are not set.",
        variant: "destructive",
      });
      return;
    }

    try {
      setStatusMessage("Getting microphone access...");
      
      // First set recording state so it's available to the generator
      setIsRecording(true);
      setSubmitted(true);
      
      // Wait a moment for state to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Initialize audio context 
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Request user media
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1, 
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Create source node from the microphone stream
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
      
      // Create a ScriptProcessorNode for processing audio data
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // In a production app, AudioWorkletNode would be better but needs more setup
      const bufferSize = 2048; // Smaller buffer size
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      
      // Get actual sample rate - browser might not honor our requested rate
      const actualSampleRate = audioContextRef.current.sampleRate;
      console.log(`Actual sample rate from AudioContext: ${actualSampleRate}Hz`);
      
      // Flag to determine if we need to resample
      const needsResampling = Math.abs(actualSampleRate - 16000) > 100;
      console.log(`Resampling needed: ${needsResampling}`);
      
      // Connect the nodes
      sourceNodeRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      // Reset state
      audioChunksRef.current = [];
      setTranscript("");
      setStatusMessage("Recording and transcribing...");
      if (onStart) onStart();
      
      // Create the transcribe client
      transcribeClientRef.current = new TranscribeStreamingClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY
        }
      });
      
      // Collect audio data via ScriptProcessorNode
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Make a copy of the audio data
        const audioChunk = new Float32Array(inputData.length);
        audioChunk.set(inputData);
        
        // Resample if needed to match AWS Transcribe's expected 16kHz
        const processedChunk = needsResampling 
          ? resampleAudio(audioChunk, actualSampleRate, 16000)
          : audioChunk;
        
        // Normalize and boost audio - improves speech recognition
        let maxSample = 0;
        let sumSquared = 0;
        
        for (let i = 0; i < processedChunk.length; i++) {
          const sample = Math.abs(processedChunk[i]);
          maxSample = Math.max(maxSample, sample);
          sumSquared += processedChunk[i] * processedChunk[i];
        }
        
        // Calculate RMS amplitude
        const rms = Math.sqrt(sumSquared / processedChunk.length);
        
        // Update audio level meter for visualization
        const currentAudioLevel = Math.min(rms * 5, 1);
        setAudioLevel(currentAudioLevel);
        setLastAudioLevel(currentAudioLevel);
        
        // Reset or start silence detection timeout
        if (noSpeechTimeout) {
          clearTimeout(noSpeechTimeout);
        }
        setNoSpeechTimeout(setTimeout(checkForSilence, 2000)); // Check for silence after 2 seconds
        
        // Apply strong gain - AWS Transcribe needs loud, clear audio
        // Always boost audio significantly to ensure detection
        const targetRMS = 0.3;  // Higher target RMS level for better detection
        const gain = Math.min(Math.max(targetRMS / Math.max(rms, 0.01), 2.0), 10.0);  // Min gain 2x, Max gain 10x
        
        // Apply gain to all samples
        for (let i = 0; i < processedChunk.length; i++) {
          processedChunk[i] *= gain;
          
          // Apply soft clipping to prevent harsh distortion
          if (processedChunk[i] > 0.9) {
            processedChunk[i] = 0.9 + 0.1 * Math.tanh((processedChunk[i] - 0.9) * 10);
          } else if (processedChunk[i] < -0.9) {
            processedChunk[i] = -0.9 - 0.1 * Math.tanh((-processedChunk[i] - 0.9) * 10);
          }
        }
        
        console.log(`Boosted audio by ${gain.toFixed(2)}x (RMS: ${rms.toFixed(4)}, Peak: ${maxSample.toFixed(4)})`);
        
        // Store processed chunk for streaming
        audioChunksRef.current.push(processedChunk);
      };
      
      // Create audio stream generator
      async function* audioGenerator() {
        const chunkSize = 1024; // Smaller chunks for better streaming
        let chunkCounter = 0;
        let lastLogTime = Date.now();
        let lastChunkTime = Date.now();
        
        // Track recording state locally
        const startTime = Date.now();
        const shouldRunUntil = startTime + 18000; // Run for at least 18 seconds
        let isActive = true;
        
        try {
          // Make a local copy of the recording state variable
          // This will make the generator independent of React state updates
          console.log("Starting audio generator, will run for at least 18 seconds");
          
          // Check recording state periodically but don't rely on it exclusively
          const checkRecordingInterval = setInterval(() => {
            // Only stop from external state after minimum time period
            if (!isRecording && Date.now() > shouldRunUntil) {
              isActive = false;
              console.log("Generator detected recording intentionally stopped");
            }
          }, 100);
          
          while (isActive || Date.now() < shouldRunUntil) {
            // Ensure we run for at least the minimum time regardless of state
            if (Date.now() < shouldRunUntil && !isActive) {
              console.log("Continuing to run generator despite state change");
              isActive = true;
            }
            
            // Wait for audio data to be processed
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check if we have new audio chunks
            if (audioChunksRef.current.length > 0) {
              lastChunkTime = Date.now();
              // Process all available chunks
              while (audioChunksRef.current.length > 0) {
                const nextChunk = audioChunksRef.current.shift()!;
                const int16Data = convertFloat32ToInt16(nextChunk);
                
                // Send in small chunks to avoid overwhelming AWS
                for (let offset = 0; offset < int16Data.length; offset += chunkSize) {
                  const end = Math.min(offset + chunkSize, int16Data.length);
                  const chunk = int16Data.slice(offset, end);
                  
                  // Log periodically to avoid console spam
                  chunkCounter++;
                  if (chunkCounter % 10 === 0 || Date.now() - lastLogTime > 1000) {
                    console.log(`Sending audio chunk ${chunkCounter}: ${chunk.length} samples`);
                    lastLogTime = Date.now();
                  }
                  
                  // Yield the chunk
                  yield {
                    AudioEvent: {
                      AudioChunk: new Uint8Array(chunk.buffer)
                    }
                  };
                  
                  // Small delay between chunks
                  await new Promise(resolve => setTimeout(resolve, 20));
                }
              }
            } else if (Date.now() - lastChunkTime > 500) {
              // Send a small "keepalive" audio chunk with minimal noise to prevent
              // AWS from disconnecting due to silence
              lastChunkTime = Date.now();
              
              // Create a small silent chunk with tiny amount of noise
              const silentChunk = new Float32Array(160); // 10ms at 16kHz
              for (let i = 0; i < silentChunk.length; i++) {
                // Add a tiny bit of noise so it's not pure silence
                silentChunk[i] = (Math.random() - 0.5) * 0.001;
              }
              
              const int16Data = convertFloat32ToInt16(silentChunk);
              
              if (chunkCounter % 20 === 0) {
                console.log("Sending keepalive audio chunk");
              }
              
              chunkCounter++;
              
              yield {
                AudioEvent: {
                  AudioChunk: new Uint8Array(int16Data.buffer)
                }
              };
            }
          }
          
          console.log("Audio stream ended");
          clearInterval(checkRecordingInterval);
          
          // Send one final set of audio to ensure AWS has something to process
          const finalSilentChunk = new Float32Array(1600);
          for (let i = 0; i < finalSilentChunk.length; i++) {
            // Add a tiny bit of noise
            finalSilentChunk[i] = (Math.random() - 0.5) * 0.0005;
          }
          
          console.log("Sending final audio chunk");
          yield {
            AudioEvent: {
              AudioChunk: new Uint8Array(convertFloat32ToInt16(finalSilentChunk).buffer)
            }
          };
          
          // Give AWS time to process the audio
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error("Audio streaming error:", error);
        } finally {
          console.log("Sending empty chunk to signal end of audio");
          // Final yield to signal completion
          yield { 
            AudioEvent: { 
              AudioChunk: new Uint8Array(0) 
            } 
          };
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
        ShowSpeakerLabel: false
      };
      
      console.log("Starting live transcription...");
      
      // Start transcription
      const command = new StartStreamTranscriptionCommand(transcribeParams);
      const response = await transcribeClientRef.current.send(command);
      
      console.log("Transcribe session established");
      
      // Process transcription results
      const stream = response.TranscriptResultStream;
      if (stream) {
        (async () => {
          let finalTranscript = "";
          let noResultCounter = 0;
          let hasSpokenContent = false;
          
          try {
            console.log("Starting to process transcription stream");
            for await (const event of stream) {
              if (event?.TranscriptEvent?.Transcript) {
                console.log("Received transcription event:", JSON.stringify(event, null, 2));
                
                for (const result of event.TranscriptEvent.Transcript.Results || []) {
                  if (result?.Alternatives && 
                      result.Alternatives.length > 0 && 
                      result.Alternatives[0].Transcript) {
                    
                    const text = result.Alternatives[0].Transcript;
                    console.log(`Received text: "${text}", IsPartial: ${result.IsPartial}`);
                    
                    // Handle partial vs final results
                    if (!result.IsPartial) {
                      finalTranscript += text + " ";
                      setTranscript(finalTranscript.trim());
                      hasSpokenContent = true;
                    } else {
                      setTranscript(text);
                    }
                  }
                }
              } else {
                // Count empty events for debugging
                noResultCounter++;
                if (noResultCounter % 5 === 0) {
                  console.log(`Received ${noResultCounter} events with no transcription`);
                }
              }
            }
            console.log("Transcription stream completed");
            
            // Handle end of transcription
            if (!isRecording) {
              if (hasSpokenContent && finalTranscript.trim()) {
                console.log("Final transcript:", finalTranscript.trim());
                if (onStop) onStop(finalTranscript.trim());
              } else {
                console.log("No valid transcription results");
                toast({
                  title: "No speech detected",
                  description: "Try speaking louder or check your microphone.",
                  variant: "destructive",
                });
              }
            }
          } catch (error) {
            console.error("Error processing transcription stream:", error);
            
            // If we have final transcript and spoken content, still use it
            if (hasSpokenContent && finalTranscript) {
              console.log("Using existing transcript despite error");
              if (onStop) onStop(finalTranscript.trim());
            }
          }
        })();
      }
      
      // Set a maximum recording time
      setTimeout(() => {
        if (isRecording) {
          console.log("Auto-stopping recording after timeout");
          stopRecording();
        }
      },
      20000); // 20 seconds max
      
    } catch (error) {
      console.error("Error setting up transcription:", error);
      setStatusMessage("");
      toast({
        title: "Setup Error",
        description: "Could not initialize transcription. Please try again.",
        variant: "destructive",
      });
      cleanupResources();
      setSubmitted(false);
      setIsRecording(false);
    }
  };

  // Clean up all resources
  const cleanupResources = () => {
    console.log("Cleaning up resources");
    
    // Clear the no speech timeout
    if (noSpeechTimeout) {
      clearTimeout(noSpeechTimeout);
      setNoSpeechTimeout(null);
    }
    
    // Disconnect and clean up audio nodes
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      } catch (e) {
        console.warn("Error disconnecting processor:", e);
      }
      processorRef.current = null;
    }
    
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        console.warn("Error disconnecting source:", e);
      }
      sourceNodeRef.current = null;
    }
    
    // Stop all media tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn("Error stopping media tracks:", e);
      }
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }
    
    // Destroy transcribe client
    if (transcribeClientRef.current) {
      try {
        transcribeClientRef.current.destroy();
      } catch (e) {
        console.warn("Error destroying transcribe client:", e);
      }
      transcribeClientRef.current = null;
    }
  };

  // Stop recording and cleanup
  const stopRecording = () => {
    console.log("Stopping recording");
    setIsRecording(false);
    setStatusMessage("Processing final results...");
    
    // Clear the no speech timeout if it exists
    if (noSpeechTimeout) {
      clearTimeout(noSpeechTimeout);
      setNoSpeechTimeout(null);
    }
    
    // Immediate cleanup after a short delay to allow final processing
    setTimeout(() => {
      console.log("Cleanup delay complete");
      if (!isRecording) {
        setSubmitted(false);
        setStatusMessage("");
        cleanupResources();
      }
    }, 1000); // Reduced from 5000ms to 1000ms
  };

  const handleClick = useCallback(() => {
    if (!submitted) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [submitted]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (submitted) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      setTime(0); // Reset timer when stopped
    }

    return () => clearInterval(intervalId);
  }, [submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (isRecording) {
        cleanupResources();
      }
    };
  }, [isRecording]);

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group w-16 h-16 rounded-xl flex items-center justify-center transition-colors",
            submitted ? "bg-none" : "bg-none hover:bg-black/10 dark:hover:bg-white/10",
          )}
          type="button"
          onClick={handleClick}
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
                backgroundColor: audioLevel > 0.6 ? 'green' : (audioLevel > 0.2 ? 'yellow' : 'red')
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
          {transcript || (submitted ? "Speak now - talk clearly and directly into the microphone" : "Click mic to start")}
        </p>
      </div>
    </div>
  );
} 