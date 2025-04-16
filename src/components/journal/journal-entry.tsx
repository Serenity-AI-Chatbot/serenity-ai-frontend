"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Pencil, Save, Mic, MapPin, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { AIVoiceInput } from "@/components/journal/ai-voice-input"
import { Button } from "@/components/ui/button"

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  placeName?: string;
}

export function JournalEntry() {
  const { toast } = useToast()
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
  const savedJournalRef = useRef<{title: string; content: string; id?: string}>({ title: "", content: "" })
  
  // Get geolocation when the user toggles the switch
  useEffect(() => {
    if (useLocation && !location && !locationError) {
      getLocation();
    }
  }, [useLocation]);
  
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

  // Function to stream chat response
  const streamChatResponse = async (journalContent: string, journalTitle: string) => {
    try {
      setIsStreaming(true);
      setChatResponse("");
      
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
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-black rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Pencil className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-emerald-500">Daily Journal</h2>
      </div>

      {isProcessing ? (
        <div className="py-8">
          <div className="mb-6 text-center">
            <div className="animate-pulse mb-4">
              <div className="h-4 bg-emerald-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-emerald-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-emerald-600 dark:text-emerald-500">
              Your journal entry is being processed...
            </p>
          </div>
          
          {/* Chat response section */}
          <div className={`mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all duration-300 ${chatResponse || isStreaming ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-medium text-emerald-700 dark:text-emerald-400">
                AI Reflection
              </h3>
            </div>
            
            <div className="text-gray-800 dark:text-emerald-300 whitespace-pre-line min-h-[100px] prose prose-emerald prose-sm max-w-none">
              {chatResponse ? (
                <p>{chatResponse}</p>
              ) : isStreaming ? (
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse delay-150"></div>
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse delay-300"></div>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Thinking about your journal...
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              You can continue using the app.
            </p>
            <button
              onClick={handleNewEntry}
              className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
            >
              New Entry
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-900 dark:text-emerald-500 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-black border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-emerald-500 placeholder:text-gray-500 dark:placeholder:text-emerald-500/50"
              placeholder="Give your entry a title..."
            />
          </div>

          <div>
            <label htmlFor="entry" className="block text-sm font-medium text-gray-900 dark:text-emerald-500 mb-2">
              Write your thoughts...
            </label>
            <div className="relative">
              <textarea
                id="entry"
                rows={6}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-black border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-emerald-500 placeholder:text-gray-500 dark:placeholder:text-emerald-500/50"
                placeholder="What's on your mind today?"
              />
              <Dialog open={isVoiceInputOpen} onOpenChange={setIsVoiceInputOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="absolute bottom-2 right-2">
                    <Mic className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Voice Input</DialogTitle>
                    <DialogDescription>Speak to add text to your journal entry</DialogDescription>
                  </DialogHeader>
                  <AIVoiceInput onStart={() => setVoiceText("")} onStop={handleVoiceInput} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Location Toggle */}
          <div className="flex items-center space-x-2">
            <div className="relative inline-flex items-center cursor-pointer" onClick={() => !isGettingLocation && setUseLocation(!useLocation)}>
              <input
                type="checkbox"
                id="use-location"
                checked={useLocation}
                onChange={(e) => setUseLocation(e.target.checked)}
                disabled={isGettingLocation}
                className="sr-only"
              />
              <div 
                className={`w-11 h-6 rounded-full transition ${
                  useLocation 
                    ? 'bg-emerald-500' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div 
                  className={`transform transition-transform duration-200 absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full ${
                    useLocation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
              <label 
                htmlFor="use-location" 
                className="ml-3 flex items-center gap-2 cursor-pointer text-sm font-medium"
              >
                <MapPin className="h-4 w-4 text-emerald-500" />
                Include my location
              </label>
            </div>
          </div>

          {/* Location Status */}
          {useLocation && (
            <div className="text-sm">
              {isGettingLocation ? (
                <div className="flex items-center text-emerald-600 dark:text-emerald-500">
                  <div className="mr-2 h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  Getting your location...
                </div>
              ) : location ? (
                <div className="text-emerald-600 dark:text-emerald-500">
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

          <span className="text-red-500 text-sm mt-2">
            ⚠️ Voice input is supported only in the latest versions of Safari and Chrome browsers not supported in Brave.
          </span>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? "Saving..." : "Save Entry"}
          </button>
        </form>
      )}
    </div>
  )
}

