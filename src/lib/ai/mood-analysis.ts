import { supabase } from "@/lib/supabase-server";
import { MoodAnalysis } from "./types";

export async function analyzeMoodPatterns(userId: string, timeframe: string): Promise<MoodAnalysis> {
  try {
    const { data, error } = await supabase.rpc('get_mood_trends', {
      p_user_id: userId
    });
    
    if (error) throw error;
    if (!data) {
      return {
        dominant_mood: "neutral",
        mood_progression: [],
        recurring_patterns: []
      };
    }
    
    // Format the mood progression data
    const moodProgression = data.map((entry: any) => ({
      date: new Date(entry.entry_date).toISOString().split('T')[0],
      moods: entry.moods || {}
    }));

    // Calculate dominant mood
    const allMoods = data.flatMap((entry: any) => Object.entries(entry.moods || {}));
    const moodCounts = allMoods.reduce((acc: Record<string, number>, [mood, count]: [string, number]) => {
      acc[mood] = (acc[mood] || 0) + (typeof count === 'number' ? count : 0);
      return acc;
    }, {} as Record<string, number>);
    
    const dominantMood = Object.entries(moodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || "neutral";

    // Format patterns
    const patterns = data
      .filter((entry: any) => Object.keys(entry.moods || {}).length > 0)
      .map((entry: any) => ({
        trigger: `Entry on ${new Date(entry.entry_date).toLocaleDateString()}`,
        associated_moods: Object.keys(entry.moods || {})
      }))
      .slice(0, 5);

    return {
      dominant_mood: dominantMood,
      mood_progression: moodProgression,
      recurring_patterns: patterns
    };
  } catch (error) {
    console.error("Error in analyzeMoodPatterns:", error);
    return {
      dominant_mood: "neutral",
      mood_progression: [],
      recurring_patterns: []
    };
  }
}

export function formatMoodProgression(moodProgression: Array<{ date: string; moods: Record<string, number> }>): string {
  return moodProgression.map(entry => {
    const date = new Date(entry.date).toLocaleDateString();
    const moodsList = Object.entries(entry.moods)
      .map(([mood, count]) => `${mood}(${count})`)
      .join(', ');
    return `${date}: ${moodsList}`;
  }).join('\n');
} 