import { MoodInsights } from "@/components/mood-insights"
import { DashboardInsights } from "@/components/dashboard-insights"
import { ActivityRecommendations } from "@/components/activities/activity-recommendations"

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Mood & Activity Dashboard</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Mood Insights</h2>
          <MoodInsights />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Dashboard Analytics</h2>
          <DashboardInsights />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Recommended Activities</h2>
          <ActivityRecommendations/>
        </section>
      </div>
    </div>
  )
}