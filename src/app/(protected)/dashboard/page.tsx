import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoodInsights } from "@/components/mood-insights"
import { NavigationLinks } from "@/components/navigation-links"
import { getUserName } from "@/lib/auth" 

export default async function Home() {
  const userName = await getUserName()

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">Hi {userName}, how are you feeling today?</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your Mood Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <MoodInsights />
        </CardContent>
      </Card>

      <NavigationLinks />
    </div>
  )
}

