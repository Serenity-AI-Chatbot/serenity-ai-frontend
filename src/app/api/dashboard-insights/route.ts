import { supabase } from "@/lib/supabase"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabaseAuth.auth.getSession()
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase.rpc('get_dashboard_insights', {
      p_user_id: session.user.id,
      p_days_back: 90
    })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120'
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch dashboard insights' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}