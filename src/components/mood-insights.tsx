"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMoodStore } from "@/store/mood-store"

interface MoodData {
  chartData: Array<{
    date: string
    mood: number
  }>
  averageMood: number
  moodTrend: string
  totalEntries: number
  moodChange: string
}

export function MoodInsights() {
  const { moodData, loading, error, fetchMoodTrends } = useMoodStore()

  useEffect(() => {
    fetchMoodTrends()
  }, [fetchMoodTrends])

  if (loading) return <div>Loading mood insights...</div>
  if (error) return <div>{error}</div>
  if (!moodData) return <div>No mood data available</div>

  return (
    <div className="space-y-4">
      <p className="text-center font-medium">
        {Number.parseFloat(moodData.moodChange) === 0 
          ? "Your mood has remained stable"
          : `Your mood has ${Number.parseFloat(moodData.moodChange) > 0 ? "improved" : "decreased"} by ${Math.abs(Number.parseFloat(moodData.moodChange))}%`
        } from previous entry
      </p>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={moodData.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={"preserveStartEnd"}
            />
            <YAxis 
              domain={[1, 10]} 
              label={{ value: 'Mood Score', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ strokeWidth: 2 }}
              name="Mood"
            />
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
            <CardTitle>Current Trend</CardTitle>
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

