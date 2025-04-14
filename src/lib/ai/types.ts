// Common interfaces used across the AI features

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  recommended_moods: string[];
  difficulty_level: string;
  estimated_duration: number;
  tags: string[];
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  summary: string;
  song: string;
  mood_tags: string[];
  tags: string[];
  keywords: string[];
  created_at: string;
  similarity?: number;
  latest_articles?: Record<string, any>;
  nearby_places?: Record<string, any>;
  sentences?: string[];
  user_id?: string;
}

export interface JournalStats {
  period_start: Date;
  entry_count: number;
  mood_distribution: Record<string, number>;
  top_keywords: string[];
}

export interface MoodAnalysis {
  dominant_mood: string;
  mood_progression: Array<{
    date: string;
    moods: Record<string, number>;
  }>;
  recurring_patterns: Array<{
    trigger: string;
    associated_moods: string[];
  }>;
}

export interface ChatMessage {
  id?: string;
  chat_id?: string;
  role: "user" | "model" | "assistant";
  content: string;
  created_at?: string;
}

export interface Chat {
  id?: string;
  user_id?: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityRecommendation {
  activity: Activity;
  confidence_score: number;
  reasoning: string;
  past_success_rate?: number;
}

export interface JournalQueryResult {
  entries: JournalEntry[];
  moodAnalysis: MoodAnalysis;
  recommendations: ActivityRecommendation[];
}

// Add date patterns regex to help with journal queries
export const datePatterns = {
  monthYear: /(?:in|during|for)\s+(?:([A-Za-z]+)\s+)?(\d{4})?/i,
  dateRange: /(?:between|from)\s+(.+?)\s+(?:to|and|until)\s+(.+)/i,
  specificDate: /(?:on\s+)?([A-Za-z]+day,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})/i
}; 

export interface UserContext {
  id: number;
  user_id: string;
  entity_name: string;
  entity_type: string;
  information: Record<string, any>;
  relevance_score: number;
  created_at: string;
  updated_at: string;
}

export type UserContextItem = UserContext;

export interface UserContextSaveResult {
  success: boolean;
  message: string;
  context?: UserContext;
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
} 