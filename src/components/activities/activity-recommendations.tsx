"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMoodStore } from "@/store/mood-store"

interface Activity {
  activity_id: string
  title: string
  description: string
  match_score: number
}

export function ActivityRecommendations() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const { moodData } = useMoodStore()

  useEffect(() => {
    async function fetchActivities() {
      if (!moodData?.summaryInsights?.mostCommonMoods) return
      
      try {
        const currentMoodTags = Object.keys(moodData.summaryInsights.mostCommonMoods)
        
        const response = await fetch(
          `/api/recommended-activities?mood_tags=${JSON.stringify(currentMoodTags)}`
        )
        
        if (!response.ok) throw new Error("Failed to fetch activities")
        const data = await response.json()
        setActivities(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [moodData])

  if (loading) return <div>Loading recommendations...</div>

  if (!activities.length) {
    return (
      <Card className="bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-emerald-500">Recommended Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-emerald-500/70">No activities found for your current mood.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-black">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-emerald-500">Recommended Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.activity_id} className="border border-gray-200 dark:border-emerald-500/20 rounded-lg p-4 bg-white dark:bg-black">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900 dark:text-emerald-500">{activity.title}</h3>
                <Badge variant={activity.match_score > 0.7 ? "default" : "secondary"}
                  className="bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-500"
                >
                  {Math.round(activity.match_score * 100)}% Match
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-emerald-500/70 mt-2">{activity.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}