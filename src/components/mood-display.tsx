"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useMoodStore } from "@/store/mood-store"

interface MoodDisplayProps {
  mood: number
}

export function MoodDisplay() {
  const { moodData } = useMoodStore()
  const [currentMood, setCurrentMood] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!moodData) return
    const latestMood = moodData.chartData[moodData.chartData.length - 1]?.mood ?? null
    setCurrentMood(latestMood)
    setLoading(false)
  }, [moodData])

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