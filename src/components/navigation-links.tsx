import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Activity, MessageSquare, Sparkles, User } from "lucide-react"

export function NavigationLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What do you want to do today?</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/journal" passHref>
          <Button variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50">
            <BookOpen className="mr-2 h-4 w-4" /> Journal
          </Button>
        </Link>
        <Link href="/activities" passHref>
          <Button variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50">
            <Activity className="mr-2 h-4 w-4" /> Activity
          </Button>
        </Link>
        <Link href="/chat" passHref>
          <Button variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50">
            <MessageSquare className="mr-2 h-4 w-4" /> Chat
          </Button>
        </Link>
        <Link href="/user" passHref>
          <Button variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50">
            <User className="mr-2 h-4 w-4" /> Personal Info
          </Button>
        </Link>
        <Link href="/suggestions" passHref>
          <Button variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50">
            <Sparkles className="mr-2 h-4 w-4" /> Other Suggestions
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

