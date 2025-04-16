import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Get user profile
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found is okay
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ profile: data || null });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create or update user profile
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const profileData = await req.json();
    
    // Validate required fields
    if (!profileData.display_name) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
    }
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    let result;
    
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...profileData,
          updated_at: new Date()
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          ...profileData,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      result = data;
    }
    
    return NextResponse.json({ profile: result });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update connection preferences
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const { connection_preferences } = await req.json();
    
    if (!connection_preferences) {
      return NextResponse.json({ error: 'connection_preferences is required' }, { status: 400 });
    }
    
    // Check if profile exists and create if not
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!existingProfile) {
      // Create minimal profile if it doesn't exist
      await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          display_name: user.email?.split('@')[0] || 'Anonymous',
          connection_preferences
        });
    } else {
      // Update existing profile's preferences
      await supabase
        .from('user_profiles')
        .update({
          connection_preferences,
          updated_at: new Date()
        })
        .eq('user_id', user.id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 