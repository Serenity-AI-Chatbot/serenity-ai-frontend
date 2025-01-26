"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FootprintsIcon as Walk, Brain, Users, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
interface Activity {
  id: string
  title: string
  description: string
  category: string
  difficulty_level: string
  recommended_mood_range: number[] | string
  estimated_duration: number
}

const categoryIcons = {
  physical: Walk,
  mental: Brain,
  social: Users,
}

export function ActivityGrid() {
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const url = filter 
          ? `/api/activities?category=${filter.toLowerCase()}`
          : '/api/activities'
        const response = await fetch(url)
        if (!response.ok) throw new Error("Failed to fetch activities")
        const data = await response.json()
        setActivities(data)
      } catch (error) {
        toast({
          title: "Failed to load activities",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [filter])

  async function startActivity(activityId: string) {
    try {
      const response = await fetch('/api/user-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity_id: activityId,
          status: 'in_progress',
          planned_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error("Failed to start activity")
      
      toast({
        title: "Activity started!",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Failed to start activity",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-2">
        <Button variant={filter === null ? "default" : "outline"} onClick={() => setFilter(null)}>
          All
        </Button>
        <Button variant={filter === "physical" ? "default" : "outline"} onClick={() => setFilter("physical")}>
          Physical
        </Button>
        <Button variant={filter === "mental" ? "default" : "outline"} onClick={() => setFilter("mental")}>
          Mental
        </Button>
        <Button variant={filter === "social" ? "default" : "outline"} onClick={() => setFilter("social")}>
          Social
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map((activity) => {
          const Icon = categoryIcons[activity.category as keyof typeof categoryIcons] || Brain
          const moodRange = Array.isArray(activity.recommended_mood_range) 
            ? activity.recommended_mood_range.join('-')
            : typeof activity.recommended_mood_range === 'string' 
              ? activity.recommended_mood_range
              : 'Not specified'

          return (
            <Card key={activity.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icon className="h-6 w-6" />
                  <span>{activity.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge>{activity.category}</Badge>
                <p className="mt-2">Difficulty: {activity.difficulty_level}</p>
                <p>Duration: {activity.estimated_duration} minutes</p>
                <p>Best for mood scores: {moodRange}</p>
                <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => startActivity(activity.id)}>
                  Start Activity
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}