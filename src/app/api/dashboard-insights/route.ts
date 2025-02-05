import { requireAuth } from '@/lib/supabase-server'
import { supabase } from "@/lib/supabase-server"
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Get days_back from query parameters, default to 90 if not provided
    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('daysBack') || '90')

    // Use the centralized auth check
    const { session } = await requireAuth()

    // Call the dashboard insights function with the authenticated user's ID
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

    return NextResponse.json(transformedData, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120'
      },
    })
  } catch (error) {
    console.error('Dashboard insights error:', error)
    
    // Handle unauthorized errors specifically
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Failed to fetch dashboard insights' },
      { status: 500 }
    )
  }
}