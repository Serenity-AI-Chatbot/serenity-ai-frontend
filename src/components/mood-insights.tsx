"use client"

import { useEffect, useState, useMemo } from "react"
import { Bar, BarChart, Cell, Label, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useMoodStore } from "@/store/mood-store"

const TIME_PERIODS = [
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
  { value: "90", label: "90 Days" },
  { value: "180", label: "6 Months" },
  { value: "365", label: "1 Year" },
] as const

// Function to generate a random color
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360)
  return `hsl(${hue}, 70%, 50%)`
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-2 border border-border rounded shadow-md">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.fill }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function MoodInsights() {
  const { moodData, loading, error, fetchMoodTrends } = useMoodStore()
  const [selectedDays, setSelectedDays] = useState<string>("90")

  useEffect(() => {
    fetchMoodTrends(Number(selectedDays))
  }, [fetchMoodTrends, selectedDays])

  const colorMap = useMemo(() => new Map<string, string>(), [])

  // Function to get or generate a color for a given key
  const getColor = (key: string) => {
    if (!colorMap.has(key)) {
      colorMap.set(key, getRandomColor())
    }
    return colorMap.get(key)!
  }

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
      value: count,
      fill: getColor(mood),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12) // Limit to top 12 moods for better visibility

  const totalMoods = moodChartData.reduce((acc, curr) => acc + curr.value, 0)

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
      value: count,
      fill: getColor(keyword),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12) // Limit to top 12 keywords

  const totalKeywords = keywordChartData.reduce((acc, curr) => acc + curr.value, 0)

  const moodConfig = Object.fromEntries(
    moodChartData.map((item) => [
      item.mood,
      {
        label: item.mood.charAt(0).toUpperCase() + item.mood.slice(1),
        color: item.fill,
      },
    ]),
  )

  const keywordConfig = Object.fromEntries(
    keywordChartData.map((item) => [
      item.keyword,
      {
        label: item.keyword,
        color: item.fill,
      },
    ]),
  )

  const journalConfig = {
    journalCount: {
      label: "Journal Entries",
      color: getColor("journalCount"),
    },
  }

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
          <ChartContainer config={journalConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={journalTrends}>
                <XAxis
                  dataKey="week"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <ChartTooltip content={<CustomTooltip />} />
                <Bar dataKey="journalCount" fill={journalConfig.journalCount.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mood Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={moodConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={moodChartData}
                  dataKey="value"
                  nameKey="mood"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                >
                  {moodChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {totalMoods.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Total Moods
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
                <ChartLegend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={keywordConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={keywordChartData}
                  dataKey="value"
                  nameKey="keyword"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                >
                  {keywordChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {totalKeywords.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Total Keywords
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
                <ChartLegend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}