"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const moodEmojis = ["😔", "😕", "😐", "🙂", "😊"]
const moodTags = ["Stressed", "Anxious", "Calm", "Happy", "Excited"]

export function JournalEntry() {
  const [mood, setMood] = useState(2)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [journalText, setJournalText] = useState("")
  const [customTag, setCustomTag] = useState("")

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleAddCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags((prev) => [...prev, customTag])
      setCustomTag("")
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>How are you feeling today?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="text-center text-4xl">{moodEmojis[mood]}</div>
          <Slider
            min={0}
            max={4}
            step={1}
            value={[mood]}
            onValueChange={(value) => setMood(value[0])}
            className="w-full"
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Mood Tags</h3>
          <div className="flex flex-wrap gap-2">
            {moodTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Input placeholder="Add custom tag" value={customTag} onChange={(e) => setCustomTag(e.target.value)} />
          <Button onClick={handleAddCustomTag}>Add</Button>
        </div>

        <Textarea
          placeholder="Write about your day..."
          className="min-h-[200px]"
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
        />

        <div className="bg-teal-50 p-4 rounded-md">
          <h3 className="text-lg font-medium mb-2">AI Suggestion</h3>
          <p className="text-gray-600">What made you happy today?</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Save Journal Entry</Button>
      </CardFooter>
    </Card>
  )
}

