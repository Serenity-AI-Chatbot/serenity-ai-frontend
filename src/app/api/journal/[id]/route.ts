import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("journals")
    .select(`
      id, 
      created_at, 
      mood_tags, 
      content, 
      title,
      summary,
      keywords,
      song,
      nearby_places,
      latest_articles
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Journal not found" }, { status: 404 });
  }

  const journal = {
    id: data.id,
    date: data.created_at,
    mood: data.mood_tags ? data.mood_tags.join(', ') : 'No mood recorded',
    entry: data.content,
    song: data.song,
    title: data.title,
    summary: data.summary,
    keywords: data.keywords || [],
    nearbyPlaces: data.nearby_places || [],
    latestArticles: data.latest_articles || []
  };

  return NextResponse.json(journal, {
    headers: {
      'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60'
    }
  });
}