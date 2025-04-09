import { ActivityGrid } from "@/components/activities/activity-grid"
import { ProgressTracker } from "@/components/activities/progress-tracker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityRecommendations } from "@/components/activities/activity-recommendations"
import { HeartHandshake, LightbulbIcon, Dumbbell } from 'lucide-react'

export default function ActivitiesPage() {
  return (
    <div className="container mx-auto p-4 py-8 space-y-8 max-w-7xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3 text-emerald-600">Boost Your Mood with Activities</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover activities specifically designed to improve your mental wellbeing and track your progress.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 rounded-lg p-6 flex items-center space-x-4 shadow-sm border border-emerald-100">
          <div className="bg-emerald-100 p-3 rounded-full">
            <Dumbbell className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-700">Physical Activities</h3>
            <p className="text-sm text-emerald-600/70">Exercise, walking, and movement</p>
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-lg p-6 flex items-center space-x-4 shadow-sm border border-emerald-100">
          <div className="bg-emerald-100 p-3 rounded-full">
            <LightbulbIcon className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-700">Mental Activities</h3>
            <p className="text-sm text-emerald-600/70">Mindfulness, learning, and reflection</p>
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-lg p-6 flex items-center space-x-4 shadow-sm border border-emerald-100">
          <div className="bg-emerald-100 p-3 rounded-full">
            <HeartHandshake className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-700">Social Activities</h3>
            <p className="text-sm text-emerald-600/70">Connection, communication, and sharing</p>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-6 text-emerald-600 flex items-center">
          <span className="bg-emerald-100 p-2 rounded-full mr-2">
            <LightbulbIcon className="h-5 w-5 text-emerald-600" />
          </span>
          Recommended For You
        </h2>
        <ActivityRecommendations/>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-6 text-emerald-600 flex items-center">
          <span className="bg-emerald-100 p-2 rounded-full mr-2">
            <Dumbbell className="h-5 w-5 text-emerald-600" />
          </span>
          Browse Activities
        </h2>
        <ActivityGrid />
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-emerald-600 flex items-center">
          <span className="bg-emerald-100 p-2 rounded-full mr-2">
            <HeartHandshake className="h-5 w-5 text-emerald-600" />
          </span>
          Your Progress
        </h2>
        <Tabs defaultValue="planned" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-6 bg-emerald-50 p-1">
            <TabsTrigger 
              value="planned" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              In Progress
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Completed
            </TabsTrigger>
          </TabsList>
          <TabsContent value="planned">
            <ProgressTracker type="planned" />
          </TabsContent>
          <TabsContent value="completed">
            <ProgressTracker type="completed" />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

