"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MoodData {
  averageMood: number
  moodTrend: string
  totalEntries: number
  moodChange: string
}

export function MoodInsights() {
  const [moodData, setMoodData] = useState<MoodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMoodTrends() {
      try {
        const response = await fetch("/api/mood-trends")
        if (!response.ok) {
          throw new Error("Failed to fetch mood trends")
        }
        const data = await response.json()
        setMoodData(data)
      } catch (err) {
        setError("Error fetching mood data")
      } finally {
        setLoading(false)
      }
    }

    fetchMoodTrends()
  }, [])

  if (loading) return <div>Loading mood insights...</div>
  if (error) return <div>{error}</div>
  if (!moodData) return <div>No mood data available</div>

  const data = [
    { day: "Mon", mood: 3 },
    { day: "Tue", mood: 2 },
    { day: "Wed", mood: 4 },
    { day: "Thu", mood: 3 },
    { day: "Fri", mood: 5 },
    { day: "Sat", mood: 4 },
    { day: "Sun", mood: moodData.averageMood },
  ]

  return (
    <div className="space-y-4">
      <p className="text-center font-medium">
        Your mood has {Number.parseFloat(moodData.moodChange) > 0 ? "improved" : "decreased"} by{" "}
        {Math.abs(Number.parseFloat(moodData.moodChange))}% this week!
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis domain={[1, 5]} />
            <Tooltip />
            <Line type="monotone" dataKey="mood" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Average Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moodData.averageMood.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mood Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moodData.moodTrend}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moodData.totalEntries}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

