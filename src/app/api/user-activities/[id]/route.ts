import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createRouteHandlerClient({ cookies });

    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { status, completed_at, reflection } = body;

    // Verify the activity belongs to the user and update it
    const { data, error } = await supabase
      .from('user_activities')
      .update({
        status,
        completed_at,
        reflection,
      })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select();

    if (error) {
      console.error('[ACTIVITY_PATCH]', error);
      return new NextResponse('Failed to update activity', { status: 400 });
    }

    // Check if any rows were updated
    if (!data || data.length === 0) {
      return new NextResponse('Activity not found or unauthorized', { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('[ACTIVITY_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
