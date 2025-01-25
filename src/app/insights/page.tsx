import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoodTrends } from "@/components/mood-trends"
import { SentimentBreakdown } from "@/components/sentiment-breakdown"
import { ActivityStats } from "@/components/activity-stats"

export default function InsightsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Journey So Far</h1>
        <p className="text-muted-foreground">Small steps make big changes!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Mood Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <MoodTrends />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentBreakdown />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityStats />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

