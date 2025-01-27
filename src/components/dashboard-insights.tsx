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
      <Card className="bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-emerald-500">Weekly Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.journal_trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-emerald-500/20" />
                <XAxis dataKey="week" className="text-gray-600 dark:text-emerald-500/70" />
                <YAxis className="text-gray-600 dark:text-emerald-500/70" />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(0 0 0 / 0.3)', border: '1px solid #10b981' }} />
                <Bar dataKey="journal_count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-emerald-500">Activity Distribution</CardTitle>
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
                  fill="#10b981"
                  paddingAngle={5}
                  dataKey="value"
                  label={{ fill: 'currentColor', className: 'text-gray-900 dark:text-emerald-500' }}
                >
                  {activityTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgb(0 0 0 / 0.3)', border: '1px solid #10b981' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}