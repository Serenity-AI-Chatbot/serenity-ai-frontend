import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const id = (await params).id;
    
    // Fetch the specific user context
    const { data, error } = await supabase
      .from('user_context')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const id = (await params).id;
    const payload = await req.json();
    
    // Validate payload
    if (!payload.entity_name || !payload.entity_type || !payload.information) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from('user_context')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: 'User context not found or access denied' },
        { status: 404 }
      );
    }
    
    // Update the user context
    const { data, error } = await supabase
      .from('user_context')
      .update({
        entity_name: payload.entity_name,
        entity_type: payload.entity_type,
        information: payload.information,
        relevance_score: payload.relevance_score || 0.8,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user context:', error);
      return NextResponse.json(
        { error: 'Failed to update user context' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const id = (await params).id;
    
    // Verify ownership
    const { data: existingData, error: fetchError } = await supabase
      .from('user_context')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: 'User context not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete the user context
    const { error } = await supabase
      .from('user_context')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting user context:', error);
      return NextResponse.json(
        { error: 'Failed to delete user context' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 