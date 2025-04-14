"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Settings2, Mic, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { ElevenLabsClient } from "elevenlabs";
import { 
  PollyClient, 
  SynthesizeSpeechCommand, 
  LanguageCode, 
  OutputFormat, 
  TextType, 
  Engine, 
  VoiceId 
} from "@aws-sdk/client-polly";
import { AwsTranscribeZenInput } from "@/components/journal/aws-transcribe-input-zen";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type VoiceProvider = "elevenlabs" | "webspeech" | "awspolly";
type VoiceRecognitionProvider = "webspeech" | "awstranscribe";

const ELEVEN_LABS_API_KEY = process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY;
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

export default function ZenChat({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>("awspolly");
  const [pollyVoice, setPollyVoice] = useState("Joanna");
  const [voiceRecognitionProvider, setVoiceRecognitionProvider] = useState<VoiceRecognitionProvider>("awstranscribe");
  const [shouldAutoRestart, setShouldAutoRestart] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const router = useRouter();
  const recognition = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSubmittingRef = useRef(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);

  // Add function to auto-restart voice input
  const autoRestartVoiceInput = () => {
    console.log('Attempting to auto-restart voice input...');
    console.log('Current provider:', voiceRecognitionProvider);
    console.log('isSubmittingRef:', isSubmittingRef.current);
    console.log('isAiGenerating:', isAiGenerating);
    console.log('isVoiceSpeaking:', isVoiceSpeaking);
    console.log('manuallyPaused:', manuallyPaused);
    console.log('shouldAutoRestart:', shouldAutoRestart);

    // Don't restart if manually paused or auto-restart not enabled
    if (manuallyPaused || !shouldAutoRestart) {
      console.log('Skipping auto-restart due to manual pause or auto-restart disabled');
      return;
    }

    if (voiceRecognitionProvider === "webspeech") {
      if (!isListening && recognition.current) {
        console.log('Starting WebSpeech recognition...');
        toggleListening();
      }
    } else if (voiceRecognitionProvider === "awstranscribe") {
      // Try multiple selectors to find the correct button
      const selectors = [
        'button.group.w-16.h-16',
        '.w-16.h-16.rounded-xl button',
        'button[aria-label="Record"]',
        'button:not([class*="Sheet"])',
        '.relative.max-w-xl button'
      ];

      let awsTranscribeInput = null;
      for (const selector of selectors) {
        const button = document.querySelector(selector) as HTMLButtonElement;
        console.log(`Trying selector "${selector}":`, button);
        if (button) {
          awsTranscribeInput = button;
          break;
        }
      }

      if (awsTranscribeInput && !isSubmittingRef.current) {
        console.log('Found AWS Transcribe button, clicking...');
        awsTranscribeInput.click();
      }
    }
  };

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      recognition.current = new (window as any).webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setTranscript(transcript);

        // If we detect a pause in speech, automatically submit
        if (event.results[event.results.length - 1].isFinal) {
          handleSubmit(transcript);
        }
      };

      recognition.current.onend = () => {
        if (isListening) {
          recognition.current.start();
        }
      };
    }

    // Load existing chat messages
    fetchChatMessages();

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);

  // Modify effect to handle both WebSpeech and AWS Transcribe
  useEffect(() => {
    if (!isVoiceSpeaking && !isAiGenerating && shouldAutoRestart) {
      console.log('Voice stopped speaking, preparing to restart input...');
      // Small delay to ensure everything is cleaned up
      const timer = setTimeout(() => {
        console.log('Timeout complete, calling autoRestartVoiceInput...');
        autoRestartVoiceInput();
      }, 1000); // Increased delay to 1 second for better cleanup
      return () => clearTimeout(timer);
    }
  }, [isVoiceSpeaking, isAiGenerating, shouldAutoRestart]);

  useEffect(() => {
    // Add effect to stop WebSpeech recognition when AI is generating
    if (isAiGenerating && recognition.current && isListening) {
      recognition.current.stop();
      setIsListening(false);
    }
  }, [isAiGenerating, isListening]);

  const fetchChatMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${chatId}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages(data.map((msg: any) => ({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.content
      })));
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const toggleListening = () => {
    if (!recognition.current) return;

    if (!isListening) {
      recognition.current.start();
      setIsListening(true);
    } else {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = async (text: string) => {
    if (!text.trim() || isProcessing || isSubmittingRef.current) return;

    // Don't submit if it's a "no speech detected" message
    if (text.toLowerCase().includes("no speech detected")) {
      console.log('Ignoring "no speech detected" message');
      setIsProcessing(false);
      setIsAiGenerating(false);
      isSubmittingRef.current = false;
      return;
    }

    // Set the ref to prevent duplicate submissions
    isSubmittingRef.current = true;
    
    setIsProcessing(true);
    setIsAiGenerating(true);
    
    const userMessage: Message = { role: "user" as const, content: text };
    setMessages(prev => [...prev, userMessage]);
    setTranscript("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          chatId
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let assistantMessage = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonData = JSON.parse(line.slice(5));
              if (jsonData.text) {
                assistantMessage += jsonData.text;
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: "assistant", content: assistantMessage }
                ]);
              }
            } catch (error) {
              console.error("Error parsing JSON:", error);
            }
          }
        }
      }

      // Enable auto-restart for the next round and reset manual pause
      setShouldAutoRestart(true);
      setManuallyPaused(false);

      // Speak the response
      await speakText(assistantMessage);

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, there was an error processing your request." }
      ]);
    } finally {
      setIsProcessing(false);
      setIsAiGenerating(false);
      isSubmittingRef.current = false;
    }
  };

  const speakTextElevenLabs = async (text: string) => {
    try {
      setIsAiGenerating(true);
      setIsVoiceSpeaking(true);
      
      const client = new ElevenLabsClient({
        apiKey: ELEVEN_LABS_API_KEY,
      });

      const audio = await client.generate({
        voice: "Rachel",
        model_id: "eleven_turbo_v2_5",
        text,
      });

      const chunks = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }

      const blob = new Blob(chunks, { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(blob);
      const audioElement = new Audio(audioUrl);

      currentAudioRef.current = audioElement;

      audioElement.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        setIsAiGenerating(false);
        setIsVoiceSpeaking(false);
      };

      await audioElement.play();
    } catch (error) {
      console.error("Error generating speech:", error);
      setIsAiGenerating(false);
      setIsVoiceSpeaking(false);
    }
  };

  const speakTextWebSpeech = (text: string) => {
    if (!window.speechSynthesis) return;

    setIsAiGenerating(true);
    setIsVoiceSpeaking(true);
    stopCurrentAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = [
      "Samantha",
      "Karen",
      "Daniel",
      "Google UK English Female",
    ];

    const voice = voices.find(
      v => preferredVoices.some(pv => v.name.includes(pv)) && v.lang.startsWith("en")
    ) || voices.find(v => v.lang.startsWith("en"));

    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setIsAiGenerating(false);
      setIsVoiceSpeaking(false);
    };

    utterance.onerror = () => {
      setIsAiGenerating(false);
      setIsVoiceSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakTextPolly = async (text: string) => {
    try {
      setIsAiGenerating(true);
      setIsVoiceSpeaking(true);
      
      const pollyClient = new PollyClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID || "",
          secretAccessKey: AWS_SECRET_ACCESS_KEY || ""
        }
      });
      
      const params = {
        Engine: "neural" as Engine,
        OutputFormat: "mp3" as OutputFormat,
        Text: text,
        VoiceId: pollyVoice as VoiceId,
        TextType: "text" as TextType,
        LanguageCode: "en-US" as LanguageCode
      };
      
      const command = new SynthesizeSpeechCommand(params);
      const data = await pollyClient.send(command);
      
      if (data.AudioStream) {
        const uInt8Array = await data.AudioStream.transformToByteArray();
        const blob = new Blob([uInt8Array], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setIsAiGenerating(false);
          setIsVoiceSpeaking(false);
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error("Error with AWS Polly:", error);
      setIsAiGenerating(false);
      setIsVoiceSpeaking(false);
      // Fallback to Web Speech API
      speakTextWebSpeech(text);
    }
  };

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      URL.revokeObjectURL(currentAudioRef.current.src);
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAiGenerating(false);
    setIsVoiceSpeaking(false);
  };

  const speakText = async (text: string) => {
    setIsAiGenerating(true);
    
    if (voiceProvider === "elevenlabs") {
      await speakTextElevenLabs(text);
    } else if (voiceProvider === "awspolly") {
      await speakTextPolly(text);
    } else {
      speakTextWebSpeech(text);
    }
  };

  const handleVoiceInput = (text: string) => {
    if (!text || !text.trim()) return;
    
    // Prevent submission if already submitting or if AI is generating
    if (isSubmittingRef.current || isAiGenerating) {
      console.log("Ignoring voice input - already submitting or AI is generating");
      return;
    }

    console.log("Submitting voice input:", text.trim());
    handleSubmit(text);
  };

  // Explicitly prevent duplicate submissions during transitions
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clean up any active audio and recognition when navigating away
      stopCurrentAudio();
      if (recognition.current) {
        recognition.current.stop();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Handle manual stop/start
  const handleManualToggle = () => {
    if (isListening || isSubmittingRef.current) {
      // User is manually stopping
      setManuallyPaused(true);
      setShouldAutoRestart(false);
    } else {
      // User is manually starting
      setManuallyPaused(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button
            variant="ghost"
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Zen Mode
          </Button>

          <div className="flex items-center space-x-2">
            {isVoiceSpeaking && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-500 border-amber-500 hover:bg-amber-500/10"
                onClick={stopCurrentAudio}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Stop Speaking
              </Button>
            )}
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Voice Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Voice Output Provider</label>
                    <Select
                      value={voiceProvider}
                      onValueChange={(value: VoiceProvider) => setVoiceProvider(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select voice provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webspeech">Web Speech API (Free)</SelectItem>
                        <SelectItem value="awspolly">AWS Polly (Premium)</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs (Limited Credit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {voiceProvider === "awspolly" && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">AWS Polly Voice</label>
                      <Select
                        value={pollyVoice}
                        onValueChange={setPollyVoice}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select AWS Polly voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Joanna">Joanna (Female)</SelectItem>
                          <SelectItem value="Matthew">Matthew (Male)</SelectItem>
                          <SelectItem value="Salli">Salli (Female)</SelectItem>
                          <SelectItem value="Kimberly">Kimberly (Female)</SelectItem>
                          <SelectItem value="Kevin">Kevin (Male)</SelectItem>
                          <SelectItem value="Amy">Amy (Female, British)</SelectItem>
                          <SelectItem value="Brian">Brian (Male, British)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Voice Recognition Provider</label>
                    <Select
                      value={voiceRecognitionProvider}
                      onValueChange={(value: VoiceRecognitionProvider) => setVoiceRecognitionProvider(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select voice recognition provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webspeech">Web Speech API (Browser-based)</SelectItem>
                        <SelectItem value="awstranscribe">AWS Transcribe (Premium)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Main Content Area with Split View */}
      <div className="pt-16 h-[calc(100vh-4rem)]">
        <div className="h-full flex flex-col md:flex-row">
          {/* Chat Messages Panel (Left Side) */}
          <div className="flex-1 overflow-y-auto px-4 py-4 md:border-r border-gray-200 dark:border-gray-800">
            <div className="max-w-3xl mx-auto space-y-6 pb-32">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl shadow-sm transition-all duration-200 ${
                    message.role === "user"
                      ? "ml-auto mr-0 md:mr-4 max-w-sm md:max-w-md bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20"
                      : "mr-auto ml-0 md:ml-4 max-w-sm md:max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  } ${
                    message.role === "assistant" && index === messages.length - 1 && isVoiceSpeaking
                      ? "ring-2 ring-amber-400 dark:ring-amber-500"
                      : ""
                  }`}
                >
                  {message.role === "assistant" && index === messages.length - 1 && isVoiceSpeaking && (
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-amber-400 text-white text-xs rounded-full animate-pulse">
                      Speaking
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className={`prose max-w-none ${
                      message.role === "user" 
                        ? "prose-emerald dark:prose-invert" 
                        : "prose-gray dark:prose-invert"
                    } break-words overflow-hidden`}
                    components={{
                      a: ({ node, ...props }) => (
                        <a 
                          {...props} 
                          className="break-all hover:underline text-blue-600 dark:text-blue-400"
                          target="_blank" 
                          rel="noopener noreferrer"
                        />
                      ),
                      p: ({ node, ...props }) => (
                        <p {...props} className="break-words" />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ))}

              {isProcessing && (
                <div className="max-w-md mx-auto p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Processing...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voice Input Panel (Right Side on Desktop) */}
          <div className="md:w-1/3 lg:w-1/4 border-t md:border-t-0 border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm flex flex-col">
            <div className="p-4 text-center border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">
                Voice Input
              </h3>
              {isAiGenerating && (
                <div className="mt-2 text-xs px-2 py-1 rounded-full inline-block bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  AI is {isVoiceSpeaking ? "speaking" : "processing"}...
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col justify-center items-center p-4">
              {voiceRecognitionProvider === "awstranscribe" ? (
                <div className="w-full h-full flex flex-col justify-center items-center">
                  <AwsTranscribeZenInput
                    onStart={() => {
                      if (isAiGenerating || isSubmittingRef.current) return;
                      handleManualToggle();
                      setIsProcessing(true);
                    }}
                    onStop={(text) => {
                      setIsProcessing(false);
                      handleManualToggle();
                      if (text && text.trim()) {
                        console.log("AWS Transcribe finished with text:", text);
                        handleSubmit(text);
                      }
                    }}
                    isAiGenerating={isAiGenerating || isSubmittingRef.current}
                    className="w-full h-full"
                    visualizerBars={36}
                  />
                </div>
              ) : (
                <div className="w-full space-y-4 flex flex-col items-center">
                  <div className="w-full p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm min-h-[120px] flex items-center justify-center">
                    <p className={`text-center text-lg ${isListening ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                      {isListening ? (transcript || "Listening...") : "Click the button to speak"}
                    </p>
                  </div>
                  
                  <Button
                    size="lg"
                    onClick={toggleListening}
                    disabled={isAiGenerating}
                    className={`px-6 rounded-full transition-all duration-300 ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    } ${isAiGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Mic className={`h-5 w-5 mr-2 ${isListening ? "animate-pulse" : ""}`} />
                    {isListening ? "Stop Listening" : "Start Listening"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 