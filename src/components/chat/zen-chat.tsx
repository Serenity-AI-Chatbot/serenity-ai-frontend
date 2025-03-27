"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Settings2 } from "lucide-react";
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
import { AwsTranscribeInput } from "@/components/journal/aws-transcribe-input";
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
  const [transcript, setTranscript] = useState("");
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>("awspolly");
  const [pollyVoice, setPollyVoice] = useState("Joanna");
  const [voiceRecognitionProvider, setVoiceRecognitionProvider] = useState<VoiceRecognitionProvider>("awstranscribe");
  const router = useRouter();
  const recognition = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

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
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    const userMessage: Message = { role: "user" as const, content: text };
    setMessages(prev => [...prev, userMessage]);
    setTranscript("");

    try {
      const response = await fetch("/api/chat/mock", {
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

      // Speak the response
      speakText(assistantMessage);

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, there was an error processing your request." }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakTextElevenLabs = async (text: string) => {
    try {
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
      };

      await audioElement.play();
    } catch (error) {
      console.error("Error generating speech:", error);
    }
  };

  const speakTextWebSpeech = (text: string) => {
    if (!window.speechSynthesis) return;

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

    window.speechSynthesis.speak(utterance);
  };

  const speakTextPolly = async (text: string) => {
    try {
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
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error("Error with AWS Polly:", error);
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
  };

  const speakText = (text: string) => {
    if (voiceProvider === "elevenlabs") {
      speakTextElevenLabs(text);
    } else if (voiceProvider === "awspolly") {
      speakTextPolly(text);
    } else {
      speakTextWebSpeech(text);
    }
  };

  const handleVoiceInput = (text: string) => {
    if (text.trim()) {
      handleSubmit(text);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button
            variant="ghost"
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Zen Mode
          </Button>

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
      </nav>

      {/* Main Chat Area */}
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-40">
        <div className="space-y-6 mb-20">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-2xl mx-auto p-6 rounded-2xl shadow-sm transition-all duration-200 ${
                message.role === "user"
                  ? "ml-auto bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20"
                  : "mr-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className={`prose max-w-none ${
                  message.role === "user" 
                    ? "prose-emerald dark:prose-invert" 
                    : "prose-gray dark:prose-invert"
                }`}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ))}

          {isProcessing && (
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Processing your request...</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Voice Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {voiceRecognitionProvider === "awstranscribe" ? (
            <AwsTranscribeInput
              onStart={() => setIsProcessing(true)}
              onStop={(text) => {
                setIsProcessing(false);
                handleVoiceInput(text);
              }}
              className="bg-transparent"
            />
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {isListening ? (
                    transcript || "Listening..."
                  ) : (
                    "Click the button to start speaking"
                  )}
                </p>
              </div>
              <Button
                size="lg"
                onClick={toggleListening}
                className={`px-6 rounded-xl transition-all duration-200 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
              >
                {isListening ? "Stop Listening" : "Start Listening"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 