import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ProgressTrackerProps {
  type: "planned" | "completed"
}

export function ProgressTracker({ type }: ProgressTrackerProps) {
  const activities =
    type === "planned"
      ? [
          { name: "10-minute walk", progress: 0 },
          { name: "Meditation", progress: 0 },
        ]
      : [
          { name: "Call a friend", progress: 100 },
          { name: "Journaling", progress: 100 },
        ]

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{activity.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={activity.progress} className="w-full" />
            {type === "completed" && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Reflection</h4>
                <p className="text-sm text-gray-600">How did this activity make you feel?</p>
                {/* Add a form or input for reflection here */}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

