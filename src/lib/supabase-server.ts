import { createClient } from "@supabase/supabase-js"
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { log } from "console"

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

// For protected API routes - without session caching

export async function requireAuth() {
  const supabase = getSupabaseAuthClient()
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    // Check for errors or missing session
    if (error || !session) {
      console.log('Error fetching session:', error)
      return { session: null, error: 'Unauthorized' }
    }

    return { session, error: null }
  } catch (err) {
    console.error('Unexpected error in requireAuth:', err)
    return { session: null, error: 'Unauthorized' }
  }
}
