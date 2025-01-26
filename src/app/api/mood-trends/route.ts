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
    p_user_id: session.user.id,
    p_days_back: 7,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No mood data available" }, { status: 404 })
  }

  const { average_mood, mood_trend, total_entries } = data[0]

  // Calculate the percentage change in mood
  const moodChange = ((average_mood - 3) / 3) * 100 // Assuming 3 is the neutral mood

  return NextResponse.json({
    averageMood: average_mood,
    moodTrend: mood_trend,
    totalEntries: total_entries,
    moodChange: moodChange.toFixed(2),
  })
}

