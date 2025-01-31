"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useMoodStore } from "@/store/mood-store"

// Color palette for moods
const MOOD_COLORS = {
  happy: "#FFB6C1",
  excited: "#FFD700",
  grateful: "#98FB98",
  inspired: "#87CEEB",
  connected: "#DDA0DD",
  peaceful: "#B0E0E6",
  determined: "#F08080",
  anxious: "#D3D3D3",
  hopeful: "#FFA07A",
  creative: "#9370DB",
  reflective: "#20B2AA",
  curious: "#FF7F50",
}

const TIME_PERIODS = [
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
  { value: "90", label: "90 Days" },
  { value: "180", label: "6 Months" },
  { value: "365", label: "1 Year" },
] as const

export function MoodInsights() {
  const { moodData, loading, error, fetchMoodTrends } = useMoodStore()
  const [selectedDays, setSelectedDays] = useState<string>("90")

  useEffect(() => {
    fetchMoodTrends(Number(selectedDays))
  }, [fetchMoodTrends, selectedDays])

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-muted-foreground">Loading mood insights...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  if (!moodData) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-muted-foreground">No mood data available</div>
      </div>
    )
  }

  const journalTrends = moodData.journalTrends

  // Aggregate all moods across weeks
  const moodTotals = journalTrends.reduce(
    (acc, week) => {
      Object.entries(week.moodDistribution).forEach(([mood, count]) => {
        acc[mood] = (acc[mood] || 0) + count
      })
      return acc
    },
    {} as Record<string, number>,
  )

  const moodChartData = Object.entries(moodTotals)
    .map(([mood, count]) => ({
      mood,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  // Aggregate all keywords across weeks
  const keywordTotals = journalTrends.reduce(
    (acc, week) => {
      Object.entries(week.keywordDistribution).forEach(([keywords, count]) => {
        keywords.split("\n").forEach((keyword) => {
          const cleanKeyword = keyword.replace(/^-\s*/, "").trim()
          if (cleanKeyword) {
            acc[cleanKeyword] = (acc[cleanKeyword] || 0) + count
          }
        })
      })
      return acc
    },
    {} as Record<string, number>,
  )

  const keywordChartData = Object.entries(keywordTotals)
    .map(([keyword, count]) => ({
      keyword,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <ToggleGroup
          type="single"
          value={selectedDays}
          onValueChange={(value) => {
            if (value) setSelectedDays(value)
          }}
        >
          {TIME_PERIODS.map((period) => (
            <ToggleGroupItem
              key={period.value}
              value={period.value}
              aria-label={`Show data for ${period.label}`}
              className="px-4"
            >
              {period.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries per Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={journalTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                <Bar dataKey="journalCount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mood Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moodChartData}
                  dataKey="count"
                  nameKey="mood"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({ mood, count, percent }) => `${mood} (${(percent * 100).toFixed(0)}%)`}
                >
                  {moodChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS] || `hsl(${index * 30}, 70%, 50%)`}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} entries`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={keywordChartData}
                  dataKey="count"
                  nameKey="keyword"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({ keyword, count, percent }) => `${keyword} (${(percent * 100).toFixed(0)}%)`}
                >
                  {keywordChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * (360 / keywordChartData.length)}, 70%, 60%)`} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} occurrences`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

