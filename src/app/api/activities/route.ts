import {  requireAuth, supabase } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const { session } = await requireAuth()
  
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }
  
  const category = searchParams.get('category')
  
  try {
    let query = supabase
      .from('activities')
      .select('*')
    
    if (category) {
      query = query.eq('category', category.toLowerCase())
    }
    
    const { data, error } = await query
    
    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch activities' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}