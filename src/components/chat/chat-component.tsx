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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mic, Plus, Sparkles, Trash2, Menu, X, Settings, MessageSquare, MoreVertical, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { AIVoiceInput } from "@/components/journal/ai-voice-input";
import { AwsTranscribeInput } from "@/components/journal/aws-transcribe-input";
import { useToast } from "@/hooks/use-toast";
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

const SUGGESTED_PROMPTS = [
  "I'm feeling anxious about work. Any tips?",
  "How can I improve my sleep habits?",
  "I'm having trouble focusing. What can I do?",
  "What are some good stress-relief techniques?",
];

interface Message {
  id?: string;
  chat_id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  message_count: number;
}

type VoiceProvider = "elevenlabs" | "webspeech" | "awspolly";
type VoiceRecognitionProvider = "webspeech" | "awstranscribe";

const ELEVEN_LABS_API_KEY = process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY;
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

export default function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceInputOpen, setIsVoiceInputOpen] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isVoiceResponseEnabled, setIsVoiceResponseEnabled] = useState(false);
  const [voiceProvider, setVoiceProvider] =
    useState<VoiceProvider>("webspeech");
  const [voiceRecognitionProvider, setVoiceRecognitionProvider] = useState<VoiceRecognitionProvider>("webspeech");
  const [pollyVoice, setPollyVoice] = useState("Joanna");
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const speechSynthesis =
    typeof window !== "undefined" ? window.speechSynthesis : null;
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const { toast } = useToast();
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch user's chats on component mount
  useEffect(() => {
    fetchUserChats();
  }, []);

  // Load messages when a chat is selected
  useEffect(() => {
    if (currentChatId) {
      fetchChatMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const fetchUserChats = async () => {
    setIsLoadingChats(true);
    try {
      const response = await fetch("/api/chat");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setChats(data);
      
      // If there are chats, select the most recent one
      if (data.length > 0) {
        setCurrentChatId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingChats(false);
    }
  };

  const fetchChatMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform messages to the expected format
      const formattedMessages = data.map((msg: any) => ({
        id: msg.id,
        chat_id: msg.chat_id,
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.content,
        created_at: msg.created_at
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      URL.revokeObjectURL(currentAudioRef.current.src);
      currentAudioRef.current = null;
    }
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
    isPlayingRef.current = false;
  };

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          chatId: currentChatId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      let assistantMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonData = JSON.parse(line.slice(5));
              if (jsonData.text) {
                assistantMessage += jsonData.text;
                setMessages((prev: any) => {
                  const updatedMessages = [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: assistantMessage },
                  ];
                  return updatedMessages;
                });
                
                // Update current chat ID if this is a new chat
                if (jsonData.chatId && !currentChatId) {
                  setCurrentChatId(jsonData.chatId);
                  // Refresh the chat list
                  fetchUserChats();
                }
              }
            } catch (error) {
              console.error("Error parsing JSON:", error);
            }
          }
        }
      }

      // Final message update
      setMessages((prev: any) => {
        const updatedMessages = [
          ...prev.slice(0, -1),
          { role: "assistant", content: assistantMessage },
        ];
        return updatedMessages;
      });

      // Only speak if voice response is enabled, regardless of input method
      if (isVoiceResponseEnabled) {
        await speakText(assistantMessage);
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages((prev: any) => {
        const updatedMessages = [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, there was an error processing your request.",
          },
        ];
        return updatedMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const deleteChat = async () => {
    if (!currentChatId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/chat/${currentChatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Remove the chat from the list
      setChats(chats.filter(chat => chat.id !== currentChatId));
      
      // Clear current chat
      setMessages([]);
      setCurrentChatId(null);
      
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleVoiceInput = (text: string) => {
    setVoiceText(text);
    setInput((prevInput) => prevInput + (prevInput ? " " : "") + text);
    setIsVoiceInputOpen(false);
    setIsVoiceMode(true); // Enable voice mode when using voice input
  };

  const speakTextElevenLabs = async (text: string) => {
    if (!isVoiceResponseEnabled) return;

    // Stop any currently playing audio
    stopCurrentAudio();

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
      toast({
        title: "Speech Generation Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const speakTextWebSpeech = (text: string) => {
    if (!speechSynthesis || isPlayingRef.current) return;
    stopCurrentAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const preferredVoices = [
        "Samantha",
        "Karen",
        "Daniel",
        "Google UK English Female",
        "Microsoft Libby Online (Natural)",
        "Microsoft Jenny Online (Natural)",
      ];
      const voice =
        voices.find(
          (v) =>
            preferredVoices.some((pv) => v.name.includes(pv)) &&
            v.lang.startsWith("en")
        ) || voices.find((v) => v.lang.startsWith("en"));
      if (voice) {
        utterance.voice = voice;
      }
    };
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
    isPlayingRef.current = true;
    utterance.onend = () => {
      isPlayingRef.current = false;
    };
    utterance.onerror = () => {
      isPlayingRef.current = false;
    };
    speechSynthesis.speak(utterance);
  };
  
  const speakTextPolly = async (text: string) => {
    if (!isVoiceResponseEnabled) return;
    
    // Stop any currently playing audio
    stopCurrentAudio();
    
    try {
     console.log(AWS_REGION) 
      const pollyClient = new PollyClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID || "",
          secretAccessKey: AWS_SECRET_ACCESS_KEY || ""
        }
      });
      
      // Create the Polly params object with proper typing
      const params = {
        Engine: "neural" as Engine,
        OutputFormat: "mp3" as OutputFormat,
        Text: text,
        VoiceId: pollyVoice as VoiceId,
        TextType: "text" as TextType,
        LanguageCode: "en-US" as LanguageCode
      };
      
      // Create the speech synthesis command
      const command = new SynthesizeSpeechCommand(params);
      
      // Execute the command
      const data = await pollyClient.send(command);
      
      // Convert response to audio
      if (data.AudioStream) {
        const uInt8Array = await data.AudioStream.transformToByteArray();
        const blob = new Blob([uInt8Array], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          isPlayingRef.current = false;
        };
        
        isPlayingRef.current = true;
        await audio.play();
      }
    } catch (error) {
      console.error("Error with AWS Polly:", error);
      toast({
        title: "AWS Polly Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      
      // Fallback to Web Speech API if AWS Polly fails
      speakTextWebSpeech(text);
    }
  };
  
  const speakText = (text: string) => {
    if (!isVoiceResponseEnabled) return;

    if (voiceProvider === "elevenlabs") {
      speakTextElevenLabs(text);
    } else if (voiceProvider === "awspolly") {
      speakTextPolly(text);
    } else {
      speakTextWebSpeech(text);
    }
  };

  // Format date to a readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm py-3 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Serenity AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (currentChatId) {
                  window.location.href = `/chat/zen/${currentChatId}`;
                }
              }}
              disabled={!currentChatId}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:flex"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Zen Mode
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:flex"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!currentChatId}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:flex"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Chat
            </Button>
            
            {/* Add visible settings button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="md:hidden"
            >
              <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </Button>
            
            {/* Mobile dropdown menu */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Menu</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsChatListOpen(true)}>
                  <List className="h-4 w-4 mr-2" />
                  Chats
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleNewChat}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </DropdownMenuItem>
                
                {currentChatId && (
                  <DropdownMenuItem 
                    onClick={() => {
                      window.location.href = `/chat/zen/${currentChatId}`;
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Zen Mode
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                
                {currentChatId && (
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 dark:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main area with sidebar and chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 hidden md:block overflow-y-auto">
          <div className="p-4 space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 border-gray-300 dark:border-gray-700"
              onClick={handleNewChat}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
            
            <div className="space-y-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                    currentChatId === chat.id 
                      ? "bg-gray-200 dark:bg-gray-700" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
              {chats.length === 0 && !isLoadingChats && (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">
                  No conversations yet
                </p>
              )}
              {isLoadingChats && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Loading chats...</span>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="voice-response"
                    checked={isVoiceResponseEnabled}
                    onCheckedChange={(checked) =>
                      setIsVoiceResponseEnabled(checked as boolean)
                    }
                    className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                  />
                  <label
                    htmlFor="voice-response"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-300"
                  >
                    🔈 Enable AI voice
                  </label>
                </div>
                
                {isVoiceResponseEnabled && (
                  <div className="space-y-2">
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
                        <SelectItem value="elevenlabs">ElevenLabs (Limited)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {voiceProvider === "awspolly" && (
                      <Select
                        value={pollyVoice}
                        onValueChange={(value) => setPollyVoice(value)}
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
                          <SelectItem value="Amy">Amy (British)</SelectItem>
                          <SelectItem value="Brian">Brian (British)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                
                <div className="pt-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-300 block mb-1">
                    🎤 Voice Recognition
                  </label>
                  <Select
                    value={voiceRecognitionProvider}
                    onValueChange={(value: VoiceRecognitionProvider) => setVoiceRecognitionProvider(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select voice recognition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webspeech">Web Speech API</SelectItem>
                      <SelectItem value="awstranscribe">AWS Transcribe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={handleClearChat}
                className="w-full border-gray-300 dark:border-gray-700"
              >
                Clear Chat
              </Button>
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-6 pb-20 sm:pb-4">
              {messages.length === 0 && (
                <div className="text-center py-10 sm:py-20">
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">Welcome to Serenity-AI</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto px-4">
                    I'm here to support your mental well-being. Feel free to ask me anything or try one of the suggested prompts below.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 justify-center px-4">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs sm:text-sm"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((m, index) => (
                <div
                  key={index}
                  className={`${
                    m.role === "assistant" ? "bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800 py-4 sm:py-8 -mx-4 px-4" : "py-2 sm:py-4"
                  }`}
                >
                  <div className="max-w-3xl mx-auto">
                    <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div 
                        className={`
                          ${m.role === "user" 
                            ? "bg-emerald-500 text-white rounded-lg px-4 py-3 max-w-[85%] sm:max-w-[75%]" 
                            : "text-gray-900 dark:text-gray-100 max-w-full"}
                        `}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className="prose dark:prose-invert max-w-none prose-emerald break-words overflow-hidden prose-sm sm:prose"
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
                              <p {...props} className="break-words whitespace-pre-wrap" />
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="py-4">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex justify-start">
                      <div className="inline-flex p-4 rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Input area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky bottom-0 w-full">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsSettingsOpen(true)}
                  className="md:hidden border-gray-300 dark:border-gray-700"
                >
                  <Menu className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                </Button>
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  className="flex-grow bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
                <Dialog open={isVoiceInputOpen} onOpenChange={setIsVoiceInputOpen}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsVoiceInputOpen(true)}
                    className="border-gray-300 dark:border-gray-700"
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
                    {voiceRecognitionProvider === "webspeech" ? (
                      <AIVoiceInput
                        onStart={() => setVoiceText("")}
                        onStop={handleVoiceInput}
                      />
                    ) : (
                      <AwsTranscribeInput
                        onStart={() => setVoiceText("")}
                        onStop={handleVoiceInput}
                      />
                    )}
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
              <p className="text-xs text-red-500 mt-2">
                ⚠️ Voice input supported only in latest versions of Safari and Chrome browsers (not in Brave).
              </p>
            </div>
          </div>
        </main>
      </div>
      
      {/* Bottom Sheet for Chat List (Mobile) */}
      <Sheet open={isChatListOpen} onOpenChange={setIsChatListOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
          <SheetHeader className="text-left border-b border-gray-200 dark:border-gray-800 pb-4">
            <SheetTitle>Your Conversations</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(80vh-10rem)] pt-4">
            <div className="space-y-1 px-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    handleSelectChat(chat.id);
                    setIsChatListOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 ${
                    currentChatId === chat.id 
                    ? "bg-gray-100 dark:bg-gray-800" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <MessageSquare className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {chat.last_message || "Start a new conversation"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(chat.updated_at)}</p>
                </button>
              ))}
              {chats.length === 0 && !isLoadingChats && (
                <div className="text-center py-10">
                  <p className="text-gray-500 dark:text-gray-400">
                    No conversations yet
                  </p>
                </div>
              )}
              {isLoadingChats && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              )}
            </div>
          </ScrollArea>
          <SheetFooter className="flex-col border-t border-gray-200 dark:border-gray-800 pt-4 mt-auto">
            <Button 
              onClick={() => {
                handleNewChat();
                setIsChatListOpen(false);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Menu Options</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              onClick={() => {
                setIsChatListOpen(true);
                setIsSettingsOpen(false);
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <List className="h-4 w-4 mr-2" />
              Change Chats
            </Button>
            
            {currentChatId && (
              <Button 
                onClick={() => {
                  window.location.href = `/chat/zen/${currentChatId}`;
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Zen Mode
              </Button>
            )}
            
            <Button 
              onClick={handleNewChat}
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            
            <Button 
              onClick={() => {
                const originalDialog = isSettingsOpen;
                setIsSettingsOpen(false);
                // Small delay to avoid dialog conflicts
                setTimeout(() => {
                  setIsDeleteDialogOpen(true);
                }, 100);
              }}
              className="w-full justify-start text-red-600 dark:text-red-500"
              variant="outline"
              disabled={!currentChatId}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Chat
            </Button>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <Button 
                onClick={() => {
                  const originalDialog = isSettingsOpen;
                  setIsSettingsOpen(false);
                  // Small delay to avoid dialog conflicts
                  setTimeout(() => {
                    setIsVoiceSettingsOpen(true);
                  }, 100);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Voice Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Chat Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteChat}
              disabled={isDeleting}
              className="ml-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Voice Settings Dialog */}
      <Dialog open={isVoiceSettingsOpen} onOpenChange={setIsVoiceSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice & Settings</DialogTitle>
            <DialogDescription>
              Configure your voice and chat preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mobile-voice-response"
                  checked={isVoiceResponseEnabled}
                  onCheckedChange={(checked) =>
                    setIsVoiceResponseEnabled(checked as boolean)
                  }
                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
                <label
                  htmlFor="mobile-voice-response"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-300"
                >
                  🔈 Enable AI voice
                </label>
              </div>
              
              {isVoiceResponseEnabled && (
                <div className="space-y-2 mt-3">
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
                      <SelectItem value="elevenlabs">ElevenLabs (Limited)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {voiceProvider === "awspolly" && (
                    <Select
                      value={pollyVoice}
                      onValueChange={(value) => setPollyVoice(value)}
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
                        <SelectItem value="Amy">Amy (British)</SelectItem>
                        <SelectItem value="Brian">Brian (British)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              
              <div className="pt-3">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-300 block mb-1">
                  🎤 Voice Recognition
                </label>
                <Select
                  value={voiceRecognitionProvider}
                  onValueChange={(value: VoiceRecognitionProvider) => setVoiceRecognitionProvider(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select voice recognition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webspeech">Web Speech API</SelectItem>
                    <SelectItem value="awstranscribe">AWS Transcribe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                variant="outline"
                onClick={() => {
                  handleClearChat();
                  setIsVoiceSettingsOpen(false);
                }}
                className="w-full border-gray-300 dark:border-gray-700"
              >
                Clear Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
