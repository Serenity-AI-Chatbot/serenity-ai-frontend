import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Get messages for a connection
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const connectionId = url.searchParams.get('connectionId');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';
    
    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }
    
    // Fetch messages and mark them as read
    const { data, error } = await supabase
      .rpc('get_connection_messages', { 
        p_connection_id: connectionId,
        p_user_id: user.id,
        p_limit: parseInt(limit),
        p_offset: parseInt(offset)
      });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ messages: data });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send a message in a connection
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const { connectionId, content } = await req.json();
    if (!connectionId || !content) {
      return NextResponse.json({ error: 'connectionId and content are required' }, { status: 400 });
    }
    
    // Verify user is part of the connection and connection is active
    const { data: connectionData, error: connectionError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('id', connectionId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('connection_status', 'connected')
      .single();
    
    if (connectionError || !connectionData) {
      console.error('Error verifying connection:', connectionError);
      return NextResponse.json({ error: 'Connection not found or not active' }, { status: 403 });
    }
    
    // Send message
    const { data, error } = await supabase
      .from('connection_messages')
      .insert({
        connection_id: connectionId,
        sender_id: user.id,
        content
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update the connection's updated_at timestamp
    await supabase
      .from('user_connections')
      .update({ updated_at: new Date() })
      .eq('id', connectionId);
    
    return NextResponse.json({ message: data });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 