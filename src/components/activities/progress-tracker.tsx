"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Calendar, CheckCircle2, Clock, ArrowRight, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"

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
    category: string
    estimated_duration: number
  }
}

interface ProgressTrackerProps {
  type: "planned" | "completed"
}

export function ProgressTracker({ type }: ProgressTrackerProps) {
  const { toast } = useToast()
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  // Function to fetch activities - used both initially and for refreshing
  const fetchUserActivities = async (delayMs = 0) => {
    try {
      setLoading(true)
      
      // Add a small delay if specified (useful after completing an activity)
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      const status = type === "planned" ? "in_progress" : "completed"
      const response = await fetch(`/api/user-activities?status=${status}`, {
        // Add cache busting parameter to prevent caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (!response.ok) throw new Error("Failed to fetch activities")
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Failed to load activities",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Listen for global activity changes
  useEffect(() => {
    // Create the event handler
    const handleActivitiesChanged = (event: CustomEvent) => {
      console.log("Activities changed event received:", event.detail);
      // Refresh with a slight delay to ensure backend has processed changes
      fetchUserActivities(300);
    };

    // Add event listener
    window.addEventListener('activities-changed', handleActivitiesChanged as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('activities-changed', handleActivitiesChanged as EventListener);
    };
  }, []);

  // Fetch activities when component mounts or type changes
  useEffect(() => {
    fetchUserActivities()
  }, [type, toast]) // Add toast to dependencies to satisfy React hooks rules

  async function completeActivity(id: string, reflection: string) {
    setCompleting(id)
    try {
      // Confirm the id is valid and not null/undefined
      if (!id) {
        throw new Error("Activity ID is missing");
      }

      // Log the ID being used for debugging
      console.log("Completing activity with ID:", id);

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response (${response.status}): ${errorText}`);
        
        if (response.status === 404) {
          throw new Error("Activity not found. It may have been deleted.");
        } else if (response.status === 403) {
          throw new Error("You don't have permission to modify this activity.");
        } else {
          throw new Error(`Failed to complete activity: ${errorText || response.statusText}`);
        }
      }
      
      // Remove the completed activity from the current list immediately
      setActivities(prev => prev.filter(activity => activity.id !== id));
      
      // Dispatch a custom event to notify other components that activities have changed
      const event = new CustomEvent('activities-changed', { detail: { type: 'completed', id } });
      window.dispatchEvent(event);
      
      // Refresh data from server with a small delay to allow the backend to process the change
      await fetchUserActivities(500);
      
      toast({
        title: "Activity completed!",
        description: "Great job! Your progress has been saved.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error completing activity:", error);
      toast({
        title: "Failed to complete activity",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setCompleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-emerald-600">Loading activities...</span>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-emerald-50/30 border-emerald-200">
        <CardContent className="pt-6 pb-8 flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-100 rounded-full p-3 mb-4">
            {type === "planned" ? (
              <Clock className="h-6 w-6 text-emerald-600" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            )}
          </div>
          <h3 className="text-xl font-medium text-emerald-700 mb-2">
            No {type === "planned" ? "in-progress" : "completed"} activities
          </h3>
          <p className="text-muted-foreground max-w-sm mb-4">
            {type === "planned" 
              ? "Start an activity from the 'Browse Activities' section to track your progress." 
              : "Complete some activities to see them here."}
          </p>
          <Button 
            variant="outline" 
            className="mt-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Browse Activities
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="overflow-hidden border-emerald-100 hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2 border-b border-emerald-50">
                <div className="flex justify-between items-start">
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200">
                    {activity.activities.category}
                  </Badge>
                  <div className="flex items-center text-sm text-emerald-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>
                      {new Date(activity.planned_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-lg font-semibold text-emerald-700 mt-2">
                  {activity.activities.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="py-4">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-emerald-700">
                      {activity.status === "completed" ? "Completed" : "In Progress"}
                    </span>
                    <span className="text-sm text-emerald-600">
                      {activity.status === "completed" ? "100%" : "50%"}
                    </span>
                  </div>
                  <Progress 
                    value={activity.status === "completed" ? 100 : 50} 
                    className="h-2 w-full overflow-hidden rounded-full bg-emerald-100"
                  />
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  {activity.activities.description}
                </p>
                
                <div className="flex items-center text-sm text-emerald-700 mb-2">
                  <Clock className="h-4 w-4 mr-1 text-emerald-500" />
                  <span>Duration: {activity.activities.estimated_duration} minutes</span>
                </div>
                
                {type === "planned" && (
                  <div className="mt-4 space-y-4">
                    <Textarea 
                      placeholder="How did this activity make you feel? What did you learn?"
                      className="w-full border-emerald-200 focus-visible:ring-emerald-500 text-gray-700 placeholder:text-gray-400 min-h-[100px]"
                      value={activity.reflection || ''}
                      onChange={(e) => {
                        const updatedActivities = activities.map(a => 
                          a.id === activity.id 
                            ? { ...a, reflection: e.target.value }
                            : a
                        )
                        setActivities(updatedActivities)
                      }}
                    />
                    <div className="text-xs text-emerald-600 mb-2">
                      Please share your thoughts to complete this activity. Your reflection should be at least 10 characters.
                    </div>
                    <Button 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center" 
                      onClick={() => completeActivity(activity.id, activity.reflection || '')}
                      disabled={!!(completing === activity.id || !activity.reflection || (activity.reflection && activity.reflection.length < 10))}
                    >
                      {completing === activity.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Completed
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {type === "completed" && activity.reflection && (
                  <div className="mt-4 bg-emerald-50/50 p-4 rounded-md border border-emerald-100">
                    <h4 className="font-medium text-emerald-700 mb-2 flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Your Reflection
                    </h4>
                    <p className="text-sm text-gray-600 italic">{activity.reflection}</p>
                    <div className="text-xs text-emerald-600 mt-2">
                      Completed on {activity.completed_at ? new Date(activity.completed_at).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Unknown date'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}