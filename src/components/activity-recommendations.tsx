"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Activity {
  activity_id: string
  title: string
  description: string
  match_score: number
}

export function ActivityRecommendations({ currentMood }: { currentMood: number }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch(`/api/recommended-activities?mood=${currentMood}`)
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
  }, [currentMood])

  if (loading) return <div>Loading recommendations...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.activity_id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">{activity.title}</h3>
                <Badge variant={activity.match_score > 0.7 ? "default" : "secondary"}>
                  {Math.round(activity.match_score * 100)}% Match
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}