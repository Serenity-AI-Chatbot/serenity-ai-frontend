"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"

const moodEmojis = ["😔", "😕", "😐", "🙂", "😊"]

export function MoodSlider() {
  const [mood, setMood] = useState(2)

  return (
    <div className="space-y-4">
      <div className="text-center text-4xl">{moodEmojis[mood]}</div>
      <Slider min={0} max={4} step={1} value={[mood]} onValueChange={(value) => setMood(value[0])} className="w-full" />
    </div>
  )
}

