"use client"

import { useEffect } from "react"
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
import { useMoodStore } from "@/store/mood-store"

// Color palette for moods
const MOOD_COLORS = {
  happy: "#FFB6C1", // pink
  excited: "#FFD700", // gold
  grateful: "#98FB98", // pale green
  inspired: "#87CEEB", // sky blue
  connected: "#DDA0DD", // plum
  peaceful: "#B0E0E6", // powder blue
  determined: "#F08080", // light coral
  anxious: "#D3D3D3", // light gray
  hopeful: "#FFA07A", // light salmon
  creative: "#9370DB", // medium purple
  reflective: "#20B2AA", // light sea green
  curious: "#FF7F50", // coral
}

export function MoodInsights() {
  const { moodData, loading, error, fetchMoodTrends } = useMoodStore()

  useEffect(() => {
    fetchMoodTrends()
  }, [fetchMoodTrends])

  if (loading) return <div>Loading mood insights...</div>
  if (error) return <div>{error}</div>
  if (!moodData) return <div>No mood data available</div>

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

  const moodChartData = Object.entries(moodTotals).map(([mood, count]) => ({
    mood,
    count,
  }))

  // Aggregate all keywords across weeks
  const keywordTotals = journalTrends.reduce(
    (acc, week) => {
      Object.entries(week.keywordDistribution).forEach(([keywords, count]) => {
        // Split the keywords string and count each keyword
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
    .sort((a, b) => b.count - a.count) // Sort by count in descending order

  return (
    <div className="space-y-8">
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
                <Tooltip />
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
                  label={(entry) => entry.mood}
                >
                  {moodChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS] || `hsl(${index * 30}, 70%, 50%)`}
                    />
                  ))}
                </Pie>
                <Tooltip />
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
                  label={(entry) => entry.keyword}
                >
                  {keywordChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * (360 / keywordChartData.length)}, 70%, 60%)`} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

