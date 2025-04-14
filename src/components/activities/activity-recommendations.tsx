"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMoodStore } from "@/store/mood-store"
import { Sparkles, PlayIcon, Loader2, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

interface Activity {
  activity_id: string
  title: string
  description: string
  match_score: number
  category: string
  estimated_duration: number
}

export function ActivityRecommendations() {
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
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

  async function startActivity(activityId: string) {
    setStarting(activityId)
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
        description: "You can track it in the 'Your Progress' section",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Failed to start activity",
        variant: "destructive",
      })
    } finally {
      setStarting(null)
    }
  }

  if (loading) return (
    <Card className="border-emerald-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-emerald-700 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-emerald-500" />
          Personalized Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-emerald-600">Analyzing your mood patterns...</span>
      </CardContent>
    </Card>
  )

  if (!activities.length) {
    return (
      <Card className="border-emerald-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-emerald-700 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-emerald-500" />
            Personalized Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6 text-center">
            <ThumbsUp className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-medium text-emerald-700 mb-2">No recommendations yet</h3>
            <p className="text-emerald-600/70 text-sm">
              Keep tracking your mood to get activity recommendations tailored to your emotional patterns.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-emerald-700 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-emerald-500" />
          Personalized Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.activity_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="rounded-lg border border-emerald-200 overflow-hidden h-full flex flex-col bg-white">
                <div className="p-4 border-b border-emerald-100">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-emerald-700">{activity.title}</h3>
                    <Badge 
                      className={
                        activity.match_score > 0.8 
                          ? "bg-green-100 text-green-800 border border-green-200" 
                          : activity.match_score > 0.6
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                      }
                    >
                      {Math.round(activity.match_score * 100)}% Match
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
                <div className="p-3 mt-auto bg-emerald-50/50 flex justify-between items-center">
                  <div className="text-sm text-emerald-700">
                    {activity.category} · {activity.estimated_duration} mins
                  </div>
                  <Button 
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => startActivity(activity.activity_id)}
                    disabled={starting === activity.activity_id}
                  >
                    {starting === activity.activity_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <PlayIcon className="h-3 w-3 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}