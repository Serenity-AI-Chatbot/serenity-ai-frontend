import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
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
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch activities' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}