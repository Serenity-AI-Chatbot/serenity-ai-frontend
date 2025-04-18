"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Pencil, Save, Mic, MapPin, MessageCircle, ArrowRight, Sparkles, ExternalLink, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { AwsTranscribeZenInput } from "@/components/journal/aws-transcribe-input-zen"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  placeName?: string;
}

export function JournalEntry() {
  const { toast } = useToast()
  const router = useRouter()
  const [entry, setEntry] = useState("")
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVoiceInputOpen, setIsVoiceInputOpen] = useState(false)
  const [voiceText, setVoiceText] = useState("")
  const [useLocation, setUseLocation] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [chatResponse, setChatResponse] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [journalId, setJournalId] = useState<string | null>(null)
  const [journalReady, setJournalReady] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const savedJournalRef = useRef<{title: string; content: string; id?: string}>({ title: "", content: "" })
  
  // Get geolocation when the user toggles the switch
  useEffect(() => {
    if (useLocation && !location && !locationError) {
      getLocation();
    }
  }, [useLocation]);

  // Set up journal processing check with auto-refresh
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isProcessing && journalId && !journalReady) {
      // Auto-refresh every 3 seconds
      intervalId = setInterval(() => {
        fetchJournal(journalId);
      }, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing, journalId, journalReady]);
  
  const fetchJournal = async (id: string) => {
    if (isRefetching) return;
    
    try {
      setIsRefetching(true);
      const response = await fetch(`/api/journal/${id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch journal status");
      }
      
      const data = await response.json();
      console.log("Checking journal status:", data);
      
      // Check if journal processing is complete using similar logic to journal-detail
      const isComplete = !data.is_processing && 
                         data.summary && 
                         (data.keywords && data.keywords.length > 0) && 
                         ((data.nearbyPlaces?.places && data.nearbyPlaces.places.length > 0) || 
                          (data.latestArticles?.articles && data.latestArticles.articles.length > 0));
      
      if (isComplete) {
        setJournalReady(true);
        toast({
          title: "Journal Ready",
          description: "Your journal has been processed and is ready to view!",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error checking journal status:", error);
    } finally {
      setIsRefetching(false);
    }
  };
  
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    
    setIsGettingLocation(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // First, save the coordinates
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        // Try to get a place name using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await response.json();
          if (data && data.display_name) {
            locationData.placeName = data.display_name;
          }
        } catch (error) {
          console.error("Error getting place name:", error);
          // We still have the coordinates, so we can continue
        }
        
        setLocation(locationData);
        setIsGettingLocation(false);
      },
      (error) => {
        setLocationError(
          error.code === 1
            ? "Please allow location access to use this feature"
            : "Error getting your location"
        );
        setIsGettingLocation(false);
        setUseLocation(false);
      }
    );
  };

  // Updated function to stream chat response that captures the chat ID
  const streamChatResponse = async (journalContent: string, journalTitle: string) => {
    try {
      setIsStreaming(true);
      setChatResponse("");
      setCurrentChatId(null);
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `This is my journal entry titled "${journalTitle}": ${journalContent}. Please provide a thoughtful reflection on what I've written.`
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get chat response");
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Handle the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let done = false;
      let accumulatedResponse = "";
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            if (line.startsWith("data:")) {
              try {
                const jsonStr = line.substring(5).trim();
                const data = JSON.parse(jsonStr);
                
                if (data.text && typeof data.text === "string") {
                  accumulatedResponse += data.text;
                  setChatResponse(accumulatedResponse);
                }
                
                // Capture the chat ID from the response
                if (data.chatId && !currentChatId) {
                  setCurrentChatId(data.chatId);
                }
              } catch (e) {
                console.error("Error parsing JSON:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error streaming chat response:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response for your journal entry",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // Function to continue the conversation
  const continueChat = () => {
    if (currentChatId) {
      router.push(`/chat/${currentChatId}`);
    } else {
      toast({
        title: "Error",
        description: "Cannot continue conversation, chat ID not found",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entry.trim() || !title.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields (title and journal entry)",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      console.log("Submitting journal entry:", { title, content: entry })

      const response = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content: entry,
          location: useLocation ? location : null,
        }),
      })

      const data = await response.json()
      console.log("API Response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to save journal entry")
      }

      // Save the journal content for the chat
      savedJournalRef.current = {
        title,
        content: entry,
        id: data.id
      };
      
      // Set the journal ID for status checking
      setJournalId(data.id);

      // Journal was created but is still processing
      if (data.status === "processing") {
        setIsProcessing(true)
        toast({
          title: "Journal submitted",
          description: "Your journal entry is being processed. This may take a few moments.",
          variant: "default",
        })
        
        // Start streaming chat response after a short delay
        setTimeout(() => {
          streamChatResponse(entry, title);
        }, 500);
      } else {
        toast({
          title: "Success",
          description: "Journal entry saved successfully!",
          variant: "default",
        })
      }

      // Reset form
      setEntry("")
      setTitle("")
      setLocation(null)
      setUseLocation(false)
    } catch (error) {
      console.error("Error saving journal:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save journal entry",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVoiceInput = useCallback((text: string) => {
    setVoiceText(text)
    setEntry((prevEntry) => prevEntry + (prevEntry ? " " : "") + text)
  }, [])

  const handleNewEntry = () => {
    setIsProcessing(false);
    setChatResponse("");
    setJournalReady(false);
    setJournalId(null);
  };
  
  const viewJournal = () => {
    if (journalId) {
      router.push(`/journal/${journalId}`);
    }
  };
  
  const handleRefetch = () => {
    if (journalId) {
      fetchJournal(journalId);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto p-8 bg-white dark:bg-black rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-900/50"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-emerald-800 dark:text-emerald-400">Daily Journal</h2>
        </div>
        
        {isProcessing && (
          <Button 
            variant="outline"
            onClick={handleRefetch}
            disabled={isRefetching}
            className="flex items-center gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </motion.div>

      {isProcessing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="py-8"
        >
          {/* Processing Banner */}
          <AnimatePresence>
            {isProcessing && !journalReady && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 mb-4">
                  <svg className="w-full h-full text-emerald-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 12 12"
                        to="360 12 12"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-emerald-700 mb-2">Your journal is being processed</h3>
                <p className="text-gray-700 dark:text-gray-300 max-w-lg">
                  We're analyzing your journal entry and preparing AI insights. This process usually takes 
                  about 2 minutes to complete. The page will automatically refresh when ready.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Journal Ready Alert */}
          <AnimatePresence>
            {journalReady && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mb-8 p-4 bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between">
                  <p className="text-emerald-800 dark:text-emerald-400 mb-3 sm:mb-0">
                    Your journal is now ready to view!
                  </p>
                  <Button
                    onClick={viewJournal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                  >
                    <span>View Journal</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Chat response section */}
          <div className={`mt-8 p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all duration-500 ${chatResponse || isStreaming ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4 max-h-0 overflow-hidden'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-medium text-emerald-700 dark:text-emerald-400">
                AI Reflection
              </h3>
            </div>
            
            <div className="text-gray-800 dark:text-gray-200 min-h-[120px] max-h-[calc(70vh-200px)] overflow-y-auto pr-2 hover:pr-1 transition-all">
              {chatResponse ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="prose prose-emerald prose-sm dark:prose-invert max-w-none"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="break-words"
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
                      code: ({ node, className, children, ...props }: any) => {
                        const isInline = !className || !className.includes('language-');
                        return (
                          <code
                            className={`${className} ${isInline ? "px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono" : "bg-gray-100 dark:bg-gray-800 rounded font-mono"}`}
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {chatResponse}
                  </ReactMarkdown>
                </motion.div>
              ) : isStreaming ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 ml-2 font-medium">
                    Reflecting on your journal entry...
                  </span>
                </div>
              ) : null}
            </div>

            {/* Add Talk more button when chat response is complete */}
            {chatResponse && !isStreaming && currentChatId && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-6"
              >
                <Button 
                  onClick={continueChat}
                  variant="outline" 
                  className="flex items-center gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/30"
                >
                  <span>Talk more about this</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
          
          <div className="mt-10 text-center">
            <Button
              onClick={handleNewEntry}
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
            >
              Write a new entry
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          onSubmit={handleSubmit} 
          className="space-y-6"
        >
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-black border border-emerald-300 dark:border-emerald-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-sm"
              placeholder="Give your entry a title..."
            />
          </div>

          <div>
            <label htmlFor="entry" className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
              Write your thoughts...
            </label>
            <div className="relative">
              <textarea
                id="entry"
                rows={8}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-black border border-emerald-300 dark:border-emerald-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-sm"
                placeholder="What's on your mind today?"
              />
              <Dialog open={isVoiceInputOpen} onOpenChange={setIsVoiceInputOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="absolute bottom-3 right-3 bg-white dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-800/70 text-emerald-600 dark:text-emerald-400"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800">
                  <DialogHeader>
                    <DialogTitle className="text-emerald-700 dark:text-emerald-400">Voice Input</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                      Speak to add text to your journal entry
                    </DialogDescription>
                  </DialogHeader>
                  <AwsTranscribeZenInput onStart={() => setVoiceText("")} onStop={handleVoiceInput} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Location Toggle */}
          <div className="flex items-center space-x-2 pt-2">
            <div 
              className="relative inline-flex items-center cursor-pointer" 
              onClick={() => !isGettingLocation && setUseLocation(!useLocation)}
            >
              <input
                type="checkbox"
                id="use-location"
                checked={useLocation}
                onChange={(e) => setUseLocation(e.target.checked)}
                disabled={isGettingLocation}
                className="sr-only"
              />
              <div 
                className={`w-12 h-6 rounded-full transition-colors ${
                  useLocation 
                    ? 'bg-emerald-500 dark:bg-emerald-600' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div 
                  className={`transform transition-transform duration-300 absolute top-0.5 left-0.5 bg-white dark:bg-emerald-100 w-5 h-5 rounded-full shadow-sm ${
                    useLocation ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
              <label 
                htmlFor="use-location" 
                className="ml-3 flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-500" />
                Include my location
              </label>
            </div>
          </div>

          {/* Location Status */}
          {useLocation && (
            <div className="text-sm -mt-2 ml-16">
              {isGettingLocation ? (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <div className="mr-2 h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  Getting your location...
                </div>
              ) : location ? (
                <div className="text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location.placeName || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                  </div>
                </div>
              ) : locationError ? (
                <div className="text-red-500">{locationError}</div>
              ) : null}
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
            ⚠️ Voice input is supported only in the latest versions of Safari and Chrome browsers not supported in Brave.
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed h-auto font-medium"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Entry
              </>
            )}
          </Button>
        </motion.form>
      )}
    </motion.div>
  )
}