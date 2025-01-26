import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        *,
        activities (
          title,
          description,
          category
        )
      `)
      .eq('status', status)
      .order('planned_at', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch user activities' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('user_activities')
      .insert([body])
      .select()

    if (error) throw error

    return new Response(JSON.stringify(data[0]), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create activity' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}