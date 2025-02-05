import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(cookie?: string) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Handle cookie fallback from request headers
          if (cookie) {
            return cookie.split(';').map(c => {
              const [name, value] = c.trim().split('=')
              return { name, value }
            })
          }
          return cookieStore.getAll()
        },
        setAll: () => {} // Disable cookie setting in server components
      },
    }
  )
}