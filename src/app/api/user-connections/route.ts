import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Get user connections
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
    const status = url.searchParams.get('status') || null;
    
    // Fetch user connections
    const { data, error } = await supabase
      .rpc('get_user_connections', { 
        p_user_id: user.id,
        p_status: status
      });
    
    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ connections: data });
  } catch (error) {
    console.error('Error in connections API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Accept a connection request
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const { connectionId, action } = await req.json();
    if (!connectionId || !action) {
      return NextResponse.json({ error: 'connectionId and action are required' }, { status: 400 });
    }
    
    if (action === 'accept') {
      // Accept connection request
      const { data, error } = await supabase
        .rpc('accept_connection', { 
          p_user_id: user.id,
          p_connection_id: connectionId
        });
      
      if (error) {
        console.error('Error accepting connection:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    } else if (action === 'reject') {
      // Reject connection request
      const { data, error } = await supabase
        .rpc('reject_connection', { 
          p_user_id: user.id,
          p_connection_id: connectionId
        });
      
      if (error) {
        console.error('Error rejecting connection:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action. Supported actions: accept, reject' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in connections API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 