import { requireAuth, supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Processing PATCH request for activity ID: ${id}`);

    const { session } = await requireAuth()

    if (!session) {
      console.log("Unauthorized request - no session");
      return new Response("Unauthorized", { status: 401 })
    }

    const userId = session.user.id;
    console.log(`Authenticated user ID: ${userId}`);

    const body = await req.json();
    const { status, completed_at, reflection } = body;
    console.log(`PATCH payload: status=${status}, completed_at=${completed_at}`);

    // Verify the activity belongs to the user and update it
    const { data, error } = await supabase
      .from('user_activities')
      .update({
        status,
        completed_at,
        reflection,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('[ACTIVITY_PATCH] Supabase error:', error);
      return new NextResponse(`Failed to update activity: ${error.message}`, { status: 400 });
    }

    // Check if any rows were updated
    if (!data || data.length === 0) {
      console.log(`[ACTIVITY_PATCH] Activity not found: id=${id}, user_id=${userId}`);
      
      // Check if activity exists but doesn't belong to the user
      const { data: activityCheck } = await supabase
        .from('user_activities')
        .select('id')
        .eq('id', id)
        .single();
      
      if (activityCheck) {
        console.log('[ACTIVITY_PATCH] Activity exists but belongs to another user');
        return new NextResponse('Unauthorized to modify this activity', { status: 403 });
      } else {
        console.log('[ACTIVITY_PATCH] Activity does not exist');
        return new NextResponse('Activity not found', { status: 404 });
      }
    }

    console.log('[ACTIVITY_PATCH] Successfully updated activity');
    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('[ACTIVITY_PATCH] Unhandled error:', error);
    return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}
