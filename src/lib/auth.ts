import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function getUserName(): Promise<string> {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return "Guest"
    
    // Remove email domain if email exists, otherwise return "Guest"
    return session.user.email?.split('@')[0] || "Guest"
  } catch (error) {
    console.error('Auth error:', error)
    return "Guest"
  }
}

