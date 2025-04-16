import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Get user recommendations
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
    const limit = url.searchParams.get('limit') || '10';
    
    // Generate and fetch user recommendations
    const { data, error } = await supabase
      .rpc('generate_user_recommendations', { 
        p_user_id: user.id,
        p_limit: parseInt(limit)
      });
    
    if (error) {
      console.error('Error fetching recommendations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ recommendations: data });
  } catch (error) {
    console.error('Error in recommendations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Request a connection with another user
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const { recommendedUserId } = await req.json();
    if (!recommendedUserId) {
      return NextResponse.json({ error: 'recommendedUserId is required' }, { status: 400 });
    }
    
    // Request connection
    const { data, error } = await supabase
      .rpc('request_connection', { 
        p_user_id: user.id,
        p_recommended_user_id: recommendedUserId
      });
    
    if (error) {
      console.error('Error requesting connection:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ connectionId: data });
  } catch (error) {
    console.error('Error in recommendation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Reject a recommendation
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const recommendedUserId = url.searchParams.get('recommendedUserId');
    
    if (!recommendedUserId) {
      return NextResponse.json({ error: 'recommendedUserId is required' }, { status: 400 });
    }
    
    // Reject recommendation
    const { data, error } = await supabase
      .rpc('reject_connection', { 
        p_user_id: user.id,
        p_recommended_user_id: recommendedUserId
      });
    
    if (error) {
      console.error('Error rejecting recommendation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in recommendation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 