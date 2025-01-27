import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("journals")
    .select("id, created_at, mood_score, content")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const journals = data.map((journal) => ({
    id: journal.id,
    date: journal.created_at,
    mood: `${getMoodEmoji(journal.mood_score)} ${getMoodLabel(journal.mood_score)}`,
    entry: journal.content,
  }))

  return NextResponse.json(journals, {
    headers: {
      'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60'
    }
  })
}

function getMoodEmoji(score: number): string {
  if (score >= 8) return "😊"
  if (score >= 6) return "🙂"
  if (score >= 4) return "😐"
  if (score >= 2) return "🙁"
  return "😢"
}

function getMoodLabel(score: number): string {
  if (score >= 8) return "Happy"
  if (score >= 6) return "Good"
  if (score >= 4) return "Neutral"
  if (score >= 2) return "Sad"
  return "Very Sad"
}

