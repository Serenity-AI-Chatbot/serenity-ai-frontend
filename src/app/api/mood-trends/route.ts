import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  // Get the authenticated user's session
    const cookieStore = cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()

  if (!session || sessionError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase.rpc("get_mood_trends", {
    p_user_id: session.user.id
  })


  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No mood data available" }, { status: 404 })
  }

  // Calculate overall average mood
  const overallAverageMood = data.reduce((sum:any, day:any):any  => sum + day.average_mood, 0) / data.length

  // Calculate the percentage change between the last two entries
  const lastEntry = data[data.length - 1].average_mood
  const previousEntry = data[data.length - 2]?.average_mood || lastEntry

  const moodChange = ((lastEntry - previousEntry) / previousEntry) * 100

  // Format the data for the line chart
  const chartData = data.map((day:any) => ({
    date: new Date(day.entry_date).toLocaleDateString(),
    mood: parseFloat(day.average_mood.toFixed(2))
  }))

  return NextResponse.json({
    chartData,
    averageMood: overallAverageMood,
    moodTrend: data[data.length - 1]?.mood_trend || 'No Data',
    totalEntries: data.reduce((sum:any, day:any) => sum + day.total_entries, 0),
    moodChange: moodChange.toFixed(2),
    lastMood: lastEntry,
    previousMood: previousEntry
  }, {
    headers: {
      'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60'
    }
  })
}

