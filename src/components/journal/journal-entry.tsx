"use client"

import { useState, useCallback } from "react"
import { Pencil, Save, Mic } from "lucide-react"
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

export function JournalEntry() {
  const { toast } = useToast()
  const [entry, setEntry] = useState("")
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVoiceInputOpen, setIsVoiceInputOpen] = useState(false)
  const [voiceText, setVoiceText] = useState("")

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
        }),
      })

      const data = await response.json()
      console.log("API Response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to save journal entry")
      }

      toast({
        title: "Success",
        description: "Journal entry saved successfully!",
        variant: "default",
      })

      // Reset form
      setEntry("")
      setTitle("")
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-black rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Pencil className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-emerald-500">Daily Journal</h2>
      </div>

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
                <p className="mt-4 text-center text-sm text-gray-500">{voiceText || "Speak now..."}</p>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? "Saving..." : "Save Entry"}
        </button>
      </form>
    </div>
  )
}

