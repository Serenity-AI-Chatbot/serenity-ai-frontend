"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FootprintsIcon as Walk, Brain, Users, Loader2, Clock, BarChart, PlayIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

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

const difficultyColors = {
  easy: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hard: "bg-red-100 text-red-800 border-red-200",
}

export function ActivityGrid() {
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingActivity, setStartingActivity] = useState<string | null>(null)

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
    setStartingActivity(activityId)
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
      
      // Dispatch a custom event to notify other components that activities have changed
      const event = new CustomEvent('activities-changed', { detail: { type: 'started' } });
      window.dispatchEvent(event);
      
      toast({
        title: "Activity started!",
        description: "You can find it in your 'In Progress' tab",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Failed to start activity",
        variant: "destructive",
      })
    } finally {
      setStartingActivity(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-2 overflow-x-auto pb-2">
        <Button 
          variant={filter === null ? "default" : "outline"} 
          onClick={() => setFilter(null)}
          className={filter === null 
            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          }
        >
          All Activities
        </Button>
        {["physical", "mental", "social"].map((category) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons]
          return (
            <Button 
              key={category}
              variant={filter === category ? "default" : "outline"} 
              onClick={() => setFilter(category)}
              className={filter === category 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              }
            >
              <Icon className="h-4 w-4 mr-2" />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity, index) => {
          const Icon = categoryIcons[activity.category as keyof typeof categoryIcons] || Brain
          const moodRange = Array.isArray(activity.recommended_mood_range) 
            ? activity.recommended_mood_range.join('-')
            : typeof activity.recommended_mood_range === 'string' 
              ? activity.recommended_mood_range
              : 'Not specified'
          
          const difficultyClass = 
            activity.difficulty_level.toLowerCase() === 'easy' ? difficultyColors.easy :
            activity.difficulty_level.toLowerCase() === 'medium' ? difficultyColors.medium :
            difficultyColors.hard;

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="h-full overflow-hidden border-emerald-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 border-b border-emerald-50">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200">
                      <Icon className="h-3 w-3 mr-1" />
                      {activity.category}
                    </Badge>
                    <Badge variant="outline" className={`${difficultyClass} border`}>
                      {activity.difficulty_level}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-semibold text-emerald-700 mt-2">
                    {activity.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="text-sm text-gray-600 mb-4">
                    {activity.description}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-emerald-700">
                      <Clock className="h-4 w-4 mr-1 text-emerald-500" />
                      <span>{activity.estimated_duration} mins</span>
                    </div>
                    <div className="flex items-center text-emerald-700">
                      <BarChart className="h-4 w-4 mr-1 text-emerald-500" />
                      <span>Mood: {moodRange}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-emerald-50 pt-3">
                  <Button 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center" 
                    onClick={() => startActivity(activity.id)}
                    disabled={startingActivity === activity.id}
                  >
                    {startingActivity === activity.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Start Activity
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )
        })}
      </div>
      
      {activities.length === 0 && !loading && (
        <div className="text-center p-10 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-emerald-700 font-medium">No activities found</p>
          <p className="text-emerald-600/70 text-sm mt-1">Try selecting a different category</p>
        </div>
      )}
    </div>
  )
}