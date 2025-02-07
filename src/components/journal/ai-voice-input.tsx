"use client"

import { Mic } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

// Add TypeScript declarations for the SpeechRecognition API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface AIVoiceInputProps {
  onStart?: () => void
  onStop?: (text: string) => void
  visualizerBars?: number
  demoMode?: boolean
  demoInterval?: number
  className?: string
}

const isBrowserSupported = () => {
  return typeof window !== 'undefined' && (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    // Add Firefox support when available
    (window as any).mozSpeechRecognition
  )
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false)
  const [time, setTime] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [isDemo, setIsDemo] = useState(demoMode)
  const [recognition, setRecognition] = useState<any>(null)

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        // Add event listeners
        recognitionInstance.onstart = () => {
          setSubmitted(true);
          onStart?.();
        };

        recognitionInstance.onend = () => {
          setSubmitted(false);
        };

        recognitionInstance.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          
          if (event.results[0].isFinal) {
            onStop?.(transcript);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setSubmitted(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, [onStart, onStop]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleClick = useCallback(() => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
    } else {
      if (!submitted) {
        try {
          recognition?.start();
        } catch (error) {
          console.error('Failed to start recognition:', error);
        }
      } else {
        recognition?.stop();
        setSubmitted(false);
      }
    }
  }, [isDemo, submitted, recognition]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (submitted) {
      onStart?.()
      intervalId = setInterval(() => {
        setTime((t) => t + 1)
      }, 1000)
    }

    return () => clearInterval(intervalId)
  }, [submitted, onStart])

  useEffect(() => {
    if (!isDemo) return

    let timeoutId: NodeJS.Timeout
    const runAnimation = () => {
      setSubmitted(true)
      timeoutId = setTimeout(() => {
        setSubmitted(false)
        timeoutId = setTimeout(runAnimation, 1000)
      }, demoInterval)
    }

    const initialTimeout = setTimeout(runAnimation, 100)
    return () => {
      clearTimeout(timeoutId)
      clearTimeout(initialTimeout)
    }
  }, [isDemo, demoInterval])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!isClient || !isBrowserSupported()) {
    return (
      <div className="text-center text-red-500">
        Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.
      </div>
    )
  }

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

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                submitted ? "bg-black/50 dark:bg-white/50 animate-pulse" : "bg-black/10 dark:bg-white/10 h-1",
              )}
              style={
                submitted && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-black/70 dark:text-white/70">{submitted ? "Listening..." : "Click to speak"}</p>

        <p className="mt-4 text-sm text-center text-black/70 dark:text-white/70 max-w-md">
          {recognition?.transcript || "Speak now..."}
        </p>
      </div>
    </div>
  )
}

