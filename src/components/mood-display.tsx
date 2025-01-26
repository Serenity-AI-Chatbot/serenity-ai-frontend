"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface MoodDisplayProps {
  mood: number
}

export function MoodDisplay({ mood }: MoodDisplayProps) {
  const [currentMood, setCurrentMood] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLatestMood() {
      try {
        const response = await fetch('/api/mood-trends')
        if (!response.ok) throw new Error("Failed to fetch mood")
        const data = await response.json()
        setCurrentMood(Math.round(data.averageMood))
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestMood()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (currentMood === null) {
    return null
  }

  const emoji = currentMood >= 7 ? "😊" : currentMood >= 4 ? "😐" : "😔"

  return (
    <div className="flex items-center justify-center space-x-2 text-lg">
      <span>Feeling: {emoji}</span>
      <span>({currentMood}/10)</span>
    </div>
  )
}