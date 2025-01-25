"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FootprintsIcon as Walk, Brain, Users } from "lucide-react"

const activities = [
  { name: "10-minute walk", icon: Walk, category: "Physical", difficulty: "Easy", moodBoost: "4-8" },
  { name: "Meditation", icon: Brain, category: "Mental", difficulty: "Medium", moodBoost: "3-9" },
  { name: "Call a friend", icon: Users, category: "Social", difficulty: "Easy", moodBoost: "5-10" },
  // Add more activities as needed
]

export function ActivityGrid() {
  const [filter, setFilter] = useState<string | null>(null)

  const filteredActivities = filter ? activities.filter((activity) => activity.category === filter) : activities

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-2">
        <Button variant={filter === null ? "default" : "outline"} onClick={() => setFilter(null)}>
          All
        </Button>
        <Button variant={filter === "Physical" ? "default" : "outline"} onClick={() => setFilter("Physical")}>
          Physical
        </Button>
        <Button variant={filter === "Mental" ? "default" : "outline"} onClick={() => setFilter("Mental")}>
          Mental
        </Button>
        <Button variant={filter === "Social" ? "default" : "outline"} onClick={() => setFilter("Social")}>
          Social
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((activity, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <activity.icon className="h-6 w-6" />
                <span>{activity.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>{activity.category}</Badge>
              <p className="mt-2">Difficulty: {activity.difficulty}</p>
              <p>Best for mood scores: {activity.moodBoost}</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Start Activity</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

