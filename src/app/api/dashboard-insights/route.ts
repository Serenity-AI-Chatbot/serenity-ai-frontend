import { supabase } from "@/lib/supabase"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    // Get days_back from query parameters, default to 90 if not provided
    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('daysBack') || '90')

    // Auth check
    const cookieStore = cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabaseAuth.auth.getSession()
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Call the new dashboard insights function with user_id and days_back
    const { data, error } = await supabase.rpc('get_dashboard_insights', {
      p_user_id: session.user.id,
      p_days_back: daysBack
    })

    if (error) throw error

    // Transform the data if needed (the function already returns the correct structure)
    const transformedData = {
      journalTrends: data.journal_trends.map((trend: any) => ({
        week: trend.week,
        journalCount: trend.journal_count,
        moodDistribution: trend.mood_distribution,
        keywordDistribution: trend.keyword_distribution
      })),
      activityTrends: data.activity_trends.map((trend: any) => ({
        week: trend.week,
        completedActivities: trend.completed_activities,
        avgActivityDifficulty: trend.avg_activity_difficulty,
        activityTypes: trend.activity_types
      })),
      summaryInsights: {
        totalJournals: data.summary_insights.total_journals,
        totalActivities: data.summary_insights.total_activities,
        mostCommonMoods: data.summary_insights.most_common_moods
      }
    }

    return new Response(JSON.stringify(transformedData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120'
      },
    })
  } catch (error) {
    console.error('Dashboard insights error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch dashboard insights' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}