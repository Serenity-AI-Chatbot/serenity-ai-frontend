import { supabase } from "@/lib/supabase-server";
import { Activity, ActivityRecommendation } from "./types";

export async function fetchActivities(): Promise<Activity[]> {
  const { data, error } = await supabase.from('activities').select('*');
  if (error) {
    console.error("Error fetching activities:", error);
    throw error;
  }
  return data || [];
}

export function formatActivities(activities: Activity[]): string {
  if (!activities || activities.length === 0) {
    return "No activities found.";
  }
  
  return activities
    .map(activity => `Activity:
    Title: ${activity.title}
    Description: ${activity.description}
    Category: ${activity.category}
    Recommended Moods: ${activity.recommended_moods.join(", ")}
    Difficulty: ${activity.difficulty_level}
    Duration: ${activity.estimated_duration} minutes
    Tags: ${activity.tags.join(", ")}`)
    .join("\n\n");
}

export function formatRecommendations(recommendations: ActivityRecommendation[]): string {
  if (!recommendations || recommendations.length === 0) {
    return "No recommendations available.";
  }
  
  return recommendations.map(recommendation => {
    const activity = recommendation.activity;
    const confidence = recommendation.confidence_score.toFixed(2);
    const reasoning = recommendation.reasoning;
    const pastSuccessRate = recommendation.past_success_rate 
      ? `(${recommendation.past_success_rate.toFixed(2)}%)`
      : "";
    return `${activity.title} - Confidence: ${confidence} - Reasoning: ${reasoning} - Past Success Rate: ${pastSuccessRate}`;
  }).join("\n");
} 