import { createClient } from "@supabase/supabase-js"
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Admin client for database operations (no auth needed)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cached auth client to prevent multiple instantiations
let authClient: ReturnType<typeof createRouteHandlerClient> | null = null

// Get or create auth client
export function getSupabaseAuthClient() {
  if (!authClient) {
    authClient = createRouteHandlerClient({ cookies })
  }
  return authClient
}

// For protected API routes - with session caching
let cachedSession: any = null
const SESSION_CACHE_TIME = 60 * 1000 * 60 // 60 minute cache

export async function requireAuth() {
  const now = Date.now()
  
  // Return cached session if valid
  if (cachedSession && cachedSession.timestamp + SESSION_CACHE_TIME > now) {
    console.log("================")
    console.log('Returning cached session')
    console.log(cachedSession.data.session.user.id)
    console.log("================")
    return cachedSession.data
  }

  const supabase = getSupabaseAuthClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    throw new Error('Unauthorized')
  }

  // Cache the successful response
  cachedSession = {
    timestamp: now,
    data: { supabase, session }
  }
  
  return { supabase, session }
}