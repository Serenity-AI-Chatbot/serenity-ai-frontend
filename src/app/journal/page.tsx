import { JournalEntry } from "@/components/journal-entry"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function JournalingPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center mb-6">
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-center flex-grow">Journal Your Thoughts</h1>
        <Button variant="outline">View Past Entries</Button>
      </header>

      <blockquote className="border-l-4 border-teal-500 pl-4 italic text-gray-600 mb-8">
        "Journaling helps you understand yourself better."
      </blockquote>

      <JournalEntry />
    </div>
  )
}

