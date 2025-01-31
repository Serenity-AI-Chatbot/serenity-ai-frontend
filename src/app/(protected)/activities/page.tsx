import { ActivityGrid } from "@/components/activities/activity-grid"
import { MoodDisplay } from "@/components/mood-display"
import { ProgressTracker } from "@/components/activities/progress-tracker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityRecommendations } from "@/components/activities/activity-recommendations"

export default function ActivitiesPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">What can we do to brighten your mood?</h1>
        {/* <MoodDisplay/> */}
      </header>

      <ActivityGrid />
      <ActivityRecommendations/>
      <Tabs defaultValue="planned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="planned">Planned</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="planned">
          <ProgressTracker type="planned" />
        </TabsContent>
        <TabsContent value="completed">
          <ProgressTracker type="completed" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

