import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoodSlider } from "@/components/mood-slider"
import { MoodInsights } from "@/components/mood-insights"
import { QuickAccessCards } from "@/components/quick-access-cards"
import { NavigationLinks } from "@/components/navigation-links"

export default function Home() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">Hi [Name], how are you feeling today?</h1>

      <Card>
        <CardHeader>
          <CardTitle>Log Your Mood</CardTitle>
        </CardHeader>
        <CardContent>
          <MoodSlider />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mood Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <MoodInsights />
        </CardContent>
      </Card>

      <QuickAccessCards />

      <NavigationLinks />
    </div>
  )
}

