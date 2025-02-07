"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AIVoiceInput } from "@/components/journal/ai-voice-input";

const SUGGESTED_PROMPTS = [
  "I'm feeling anxious about work. Any tips?",
  "How can I improve my sleep habits?",
  "I'm having trouble focusing. What can I do?",
  "What are some good stress-relief techniques?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceInputOpen, setIsVoiceInputOpen] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [scrollAreaRef]); // Updated dependency

  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage]
      localStorage.setItem("chatMessages", JSON.stringify(updatedMessages))
      return updatedMessages
    })
    setInput("")
    setIsTyping(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No reader available")
      }

      let assistantMessage = ""
      setMessages((prev) => [...prev, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim() !== "")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonData = JSON.parse(line.slice(5))
              if (jsonData.text) {
                assistantMessage += jsonData.text
                setMessages((prev: any) => {
                  const updatedMessages = [...prev.slice(0, -1), { role: "assistant", content: assistantMessage }]
                  return updatedMessages
                })
              }
            } catch (error) {
              console.error("Error parsing JSON:", error)
            }
          }
        }
      }

      setMessages((prev: any) => {
        const updatedMessages = [...prev.slice(0, -1), { role: "assistant", content: assistantMessage }]
        localStorage.setItem("chatMessages", JSON.stringify(updatedMessages))
        // Speak the assistant's message if in voice mode
        if (isVoiceMode) {
          speakText(assistantMessage)
        }
        return updatedMessages
      })
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev: any) => {
        const updatedMessages = [
          ...prev,
          { role: "assistant", content: "Sorry, there was an error processing your request." },
        ]
        localStorage.setItem("chatMessages", JSON.stringify(updatedMessages))
        return updatedMessages
      })
    } finally {
      setIsTyping(false)
    }
  }


  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("chatMessages");
  };

  const handleVoiceInput = (text: string) => {
    setVoiceText(text)
    setInput((prevInput) => prevInput + (prevInput ? " " : "") + text)
    setIsVoiceInputOpen(false)
    setIsVoiceMode(true) // Enable voice mode when using voice input
  }


  const speakText = (text: string) => {
    if (speechSynthesis) {
      // Cancel any ongoing speech
      speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0
      
      // Get available voices and set a natural sounding English voice if available
      const voices = speechSynthesis.getVoices()
      const englishVoice = voices.find(
        (voice) => voice.lang.startsWith('en') && voice.name.includes('Alex')
      ) || voices.find(
        (voice) => voice.lang.startsWith('en')
      )
      
      if (englishVoice) {
        utterance.voice = englishVoice
      }
      
      speechSynthesis.speak(utterance)
      setIsVoiceMode(false)
    }
  }


  return (
    <Card className="w-full max-w-3xl mx-auto bg-white dark:bg-black shadow-xl rounded-xl overflow-hidden">
      <CardHeader className="bg-emerald-500 text-white p-6">
        <CardTitle className="text-2xl font-bold">
          Chat with MindfulAI
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[60vh] pr-4" ref={scrollAreaRef}>
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-emerald-500/70 mb-4">
              <p className="text-lg font-semibold">Welcome to Serenity-AI!</p>
              <p>
                I'm here to support your mental well-being. Feel free to ask me
                anything or try one of the suggested prompts below.
              </p>
            </div>
          )}
          {messages.map((m, index) => (
            <div
              key={index}
              className={`mb-4 ${
                m.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  m.role === "user"
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 dark:bg-black border border-emerald-500/20 text-gray-900 dark:text-emerald-500"
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose dark:prose-invert max-w-none prose-emerald"
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="text-left">
              <span className="inline-block p-3 rounded-lg bg-gray-100 dark:bg-black border border-emerald-500/20 text-gray-900 dark:text-emerald-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            </div>
          )}
        </ScrollArea>
        {messages.length === 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold mb-2 text-gray-900 dark:text-emerald-500">
              Suggested prompts:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="border-emerald-500 text-gray-900 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-gray-200 dark:border-emerald-500/20 p-4">
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-grow bg-white dark:bg-black border-emerald-500 text-gray-900 dark:text-emerald-500 placeholder:text-gray-500 dark:placeholder:text-emerald-500/50"
          />
          <Dialog open={isVoiceInputOpen} onOpenChange={setIsVoiceInputOpen}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsVoiceInputOpen(true)}
              className="border-emerald-500"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Voice Input</DialogTitle>
                <DialogDescription>
                  Speak to add text to your message
                </DialogDescription>
              </DialogHeader>
              <AIVoiceInput
                onStart={() => setVoiceText("")}
                onStop={handleVoiceInput}
              />
              <p className="mt-4 text-center text-sm text-gray-500">
                {voiceText || "Speak now..."}
              </p>
            </DialogContent>
          </Dialog>
          <Button
            type="submit"
            disabled={isTyping}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Send
          </Button>
        </form>
      </CardFooter>
      <div className="px-4 pb-4">
      <span className="text-red-500 text-sm mt-2">
        ⚠️ Voice input is supported only in the latest versions of Safari and
        Chrome browsers not supported in Brave.
      </span>
        <Button
          variant="outline"
          onClick={handleClearChat}
          className="w-full border-emerald-500 text-gray-900 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
        >
          Clear Chat
        </Button>
      </div>
    </Card>
  );
}
