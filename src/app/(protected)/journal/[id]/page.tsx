import { JournalDetail } from "@/components/journal/journal-detail";
import { supabase } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

async function getJournal(id: string) {
  try {
    const { data, error } = await supabase
      .from("journals")
      .select(
        `
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
    `
      )
      .eq("id", id)
      .single();

    const journal = {
      id: data?.id,
      date: data?.created_at,
      mood: data?.mood_tags ? data?.mood_tags.join(", ") : "No mood recorded",
      entry: data?.content,
      song: data?.song,
      title: data?.title,
      summary: data?.summary,
      keywords: data?.keywords || [],
      nearbyPlaces: data?.nearby_places || [],
      latestArticles: data?.latest_articles || [],
    };

    return journal;

  } catch (error) {
    console.error("Error fetching journal:", error);
    return null;
  }
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function JournalPage({ params }: Props) {
  const { id } = await params;
  const journal = await getJournal(id);

  if (!journal) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          {journal.title || "Mental Wellness Journal"}
        </h1>
        <JournalDetail journal={journal} />
      </div>
    </div>
  );
}