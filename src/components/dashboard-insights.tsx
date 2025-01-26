"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "recharts"

interface DashboardData {
  journal_trends: Array<{
    week: string
    avg_mood: number
    journal_count: number
    mood_distribution: {
      low: number
      moderate: number
      high: number
    }
  }>
  activity_trends: Array<{
    week: string
    completed_activities: number
    activity_types: {
      physical: number
      mental: number
      social: number
    }
  }>
  mood_progression: {
    median: number
    min_mood: number
    max_mood: number
  }
}

const ACTIVITY_COLORS = ["#FF8042", "#00C49F", "#0088FE"]

export function DashboardInsights() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/dashboard-insights")
        if (!response.ok) throw new Error("Failed to fetch dashboard data")
        const data = await response.json()
        setData(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading || !data) return <div>Loading dashboard insights...</div>

  const activityTypeData = data.activity_trends.reduce(
    (acc, curr) => {
      acc[0].value += curr.activity_types.physical
      acc[1].value += curr.activity_types.mental
      acc[2].value += curr.activity_types.social
      return acc
    },
    [
      { name: "Physical", value: 0 },
      { name: "Mental", value: 0 },
      { name: "Social", value: 0 },
    ]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.journal_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="journal_count" fill="#8884d8" />
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
                  label
                >
                  {activityTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}