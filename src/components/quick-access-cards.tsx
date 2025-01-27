import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PenLine, FootprintsIcon as Walk } from "lucide-react"

export function QuickAccessCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Write a Journal Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/journal" passHref>
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
              <PenLine className="mr-2 h-4 w-4" /> Start Journaling
            </Button>
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recommended Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Take a 10-minute walk. Let's refresh your mind!</p>
          <Link href="/activities" passHref>
            <Button variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50">
              <Walk className="mr-2 h-4 w-4" /> Start Activity
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

