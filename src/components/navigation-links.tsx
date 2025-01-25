import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Activity, BarChart2 } from "lucide-react"

export function NavigationLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Navigation</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/journal" passHref>
          <Button variant="outline" className="w-full">
            <BookOpen className="mr-2 h-4 w-4" /> Journaling
          </Button>
        </Link>
        <Link href="/activities" passHref>
          <Button variant="outline" className="w-full">
            <Activity className="mr-2 h-4 w-4" /> Activities
          </Button>
        </Link>
        <Link href="/insights" passHref>
          <Button variant="outline" className="w-full">
            <BarChart2 className="mr-2 h-4 w-4" /> Insights
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

