"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { useMoodStore } from "@/store/mood-store"

const ACTIVITY_COLORS = ["#FF8042", "#00C49F", "#0088FE"]
const MOOD_COLORS = ["#FFB6C1", "#FFD700", "#98FB98", "#87CEEB", "#DDA0DD"]

export function DashboardInsights() {
  const { moodData, loading, fetchMoodTrends } = useMoodStore()
  const [timeRange, setTimeRange] = useState("90")

  useEffect(() => {
    fetchMoodTrends(Number(timeRange))
  }, [fetchMoodTrends, timeRange])

  if (loading || !moodData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-2xl font-semibold text-gray-500 dark:text-gray-400">Loading dashboard insights...</div>
      </div>
    )
  }

  const activityTypeData = (moodData.activityTrends || []).reduce(
    (acc, curr) => {
      if (curr.activityTypes) {
        acc[0].value += curr.activityTypes.physical || 0
        acc[1].value += curr.activityTypes.mental || 0
        acc[2].value += curr.activityTypes.social || 0
      }
      return acc
    },
    [
      { name: "Physical", value: 0 },
      { name: "Mental", value: 0 },
      { name: "Social", value: 0 },
    ],
  )

  const moodDistributionData = Object.entries(moodData.summaryInsights?.mostCommonMoods || {})
    .map(([mood, count]) => ({
      name: mood,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const journalData = moodData.journalTrends.map((trend) => ({
    week: new Date(trend.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    journalCount: trend.journalCount,
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Insights</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={journalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="journalCount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activityTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {activityTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
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
            <CardTitle>Most Common Moods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moodDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {moodDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={MOOD_COLORS[index % MOOD_COLORS.length]} />
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
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold">Total Journals</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {moodData.summaryInsights.totalJournals}
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold">Total Activities</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {moodData.summaryInsights.totalActivities}
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold">Most Common Mood</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {moodDistributionData[0]?.name || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

