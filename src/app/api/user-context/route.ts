import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
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
    
    // Call the database function to get user context
    const { data: userContexts, error } = await supabase.rpc(
      'get_user_context',
      { p_user_id: userId }
    );
    
    if (error) {
      console.error('Error fetching user contexts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user contexts' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(userContexts || []);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const payload = await req.json();
    
    // Validate payload
    if (!payload.entity_name || !payload.entity_type || !payload.information) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Insert new user context
    const { data, error } = await supabase
      .from('user_context')
      .insert({
        user_id: userId,
        entity_name: payload.entity_name,
        entity_type: payload.entity_type,
        information: payload.information,
        relevance_score: payload.relevance_score || 0.8
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating user context:', error);
      return NextResponse.json(
        { error: 'Failed to create user context' },
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