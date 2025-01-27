"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserActivity {
  id: string
  activity_id: string
  status: string
  planned_at: string
  completed_at: string | null
  reflection: string | null
  activities: {
    title: string
    description: string
  }
}

interface ProgressTrackerProps {
  type: "planned" | "completed"
}

export function ProgressTracker({ type }: ProgressTrackerProps) {
  const { toast } = useToast()
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserActivities() {
      try {
        const status = type === "planned" ? "in_progress" : "completed"
        const response = await fetch(`/api/user-activities?status=${status}`)
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

    fetchUserActivities()
  }, [type])

  async function completeActivity(id: string, reflection: string) {
    try {
      const response = await fetch(`/api/user-activities/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString(),
          reflection,
        }),
      })

      if (!response.ok) throw new Error("Failed to complete activity")
      
      // Refresh activities
      const updatedActivities = activities.filter(activity => activity.id !== id)
      setActivities(updatedActivities)
      toast({
        title: "Activity completed!",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Failed to complete activity",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-white dark:bg-black">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600 dark:text-emerald-500/70">
            No {type} activities found
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id} className="bg-white dark:bg-black">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-emerald-500">{activity.activities.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={activity.status === "completed" ? 100 : 50} 
              className="w-full bg-gray-200 dark:bg-emerald-500/20"
            />
            {type === "planned" && (
              <div className="mt-4 space-y-4">
                <Textarea 
                  placeholder="How did this activity make you feel?"
                  className="w-full bg-white dark:bg-black border-emerald-500 text-gray-900 dark:text-emerald-500 placeholder:text-gray-500 dark:placeholder:text-emerald-500/50"
                  onChange={(e) => {
                    const updatedActivities = activities.map(a => 
                      a.id === activity.id 
                        ? { ...a, reflection: e.target.value }
                        : a
                    )
                    setActivities(updatedActivities)
                  }}
                />
                <Button 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => completeActivity(activity.id, activity.reflection || '')}
                >
                  Complete Activity
                </Button>
              </div>
            )}
            {type === "completed" && activity.reflection && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 dark:text-emerald-500 mb-2">Reflection</h4>
                <p className="text-sm text-gray-600 dark:text-emerald-500/70">{activity.reflection}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}