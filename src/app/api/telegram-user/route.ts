import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET current user's telegram info
export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: telegramUser, error } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error
    console.error('Error fetching telegram user:', error);
    return NextResponse.json({ error: 'Failed to fetch telegram user' }, { status: 500 });
  }

  return NextResponse.json(telegramUser || null);
}

// POST to create a new telegram user connection
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { telegram_id } = await req.json();

    if (!telegram_id) {
      return NextResponse.json({ error: 'Telegram ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('telegram_users')
      .insert({
        user_id: session.user.id,
        telegram_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating telegram user:', error);
      return NextResponse.json({ error: 'Failed to create telegram user' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PUT to update an existing telegram user connection
export async function PUT(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { telegram_id } = await req.json();

    if (!telegram_id) {
      return NextResponse.json({ error: 'Telegram ID is required' }, { status: 400 });
    }

    // First, check if the user already has a telegram connection
    const { data: existingUser } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (existingUser) {
      // Update existing record
      const { data, error } = await supabase
        .from('telegram_users')
        .update({ telegram_id, updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating telegram user:', error);
        return NextResponse.json({ error: 'Failed to update telegram user' }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // Create new record if it doesn't exist
      const { data, error } = await supabase
        .from('telegram_users')
        .insert({
          user_id: session.user.id,
          telegram_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating telegram user:', error);
        return NextResponse.json({ error: 'Failed to create telegram user' }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE to remove a telegram user connection
export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('telegram_users')
    .delete()
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error deleting telegram user:', error);
    return NextResponse.json({ error: 'Failed to delete telegram user' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 