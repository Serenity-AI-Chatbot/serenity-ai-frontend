import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  await supabase.auth.signOut();

  // Force client-side cache invalidation
  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
    headers: {
      'Clear-Site-Data': '"cache", "storage", "executionContexts"',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}