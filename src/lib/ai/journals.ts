import { supabase } from "@/lib/supabase-server";
import { format, parse } from 'date-fns';
import { generateEmbedding } from "./client";
import { JournalEntry, JournalQueryResult, MoodAnalysis, datePatterns } from "./types";
import { analyzeMoodPatterns } from "./mood-analysis";

export async function fetchRelevantJournalEntries(userId: string, userMessage: string): Promise<JournalQueryResult> {
  const queryEmbedding = await generateEmbedding(userMessage);

  try {
    // Check for date range pattern first
    const dateRangeMatch = userMessage.match(datePatterns.dateRange);
    if (dateRangeMatch) {
      const result = await fetchJournalsByDateRange(userId, dateRangeMatch);
      return {
        entries: Array.isArray(result) ? result : [],
        moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
        recommendations: [],
      };
    }

    const monthYearMatch = userMessage.match(datePatterns.monthYear);
    if (monthYearMatch) {
      const result = await fetchJournalsByMonthYear(userId, monthYearMatch);
      return {
        entries: Array.isArray(result) ? result : [],
        moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
        recommendations: [],
      };
    }

    const dateMatch = userMessage.match(datePatterns.specificDate);
    
    if (dateMatch) {
      const result = await fetchJournalsByDateOrSemantic(userId, dateMatch, queryEmbedding);
      return {
        entries: Array.isArray(result) ? result : [],
        moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
        recommendations: [],
      };
    }

    // If no date is found, fetch the last 10 journals
    const lastTenJournals = await fetchLastTenJournals(userId);
    return {
      entries: Array.isArray(lastTenJournals) ? lastTenJournals : [],
      moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
      recommendations: [],
    };
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    return {
      entries: [],
      moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
      recommendations: [],
    };
  }
}

export async function fetchLastTenJournals(userId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching last 10 journals:", error);
    return [];
  }
  return data;
}

export async function fetchLatestJournals(userId: string, limit: number): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching latest journals:", error);
    return [];
  }
  return data;
}

export async function fetchJournalsByMonthYear(userId: string, match: RegExpMatchArray): Promise<JournalEntry[]> {
  const [monthStr, yearStr] = [match[1], match[2]];
  const targetMonth = monthStr ? new Date(`${monthStr} 1, 2000`).getMonth() + 1 : null;
  const targetYear = yearStr ? parseInt(yearStr) : null;

  console.log("Monthly/Yearly journal query:");
  console.log("monthStr:", monthStr);
  console.log("yearStr:", yearStr);
  console.log("targetMonth:", targetMonth);
  console.log("targetYear:", targetYear);

  const response = await supabase.rpc('get_journals_by_date', {
    p_user_id: userId,
    p_year: targetYear,
    p_month: targetMonth
  });

  if (response.error) throw response.error;
  return response.data;
}

export async function fetchJournalsByDateOrSemantic(
  userId: string, 
  dateMatch: RegExpMatchArray | null, 
  queryEmbedding: number[]
): Promise<JournalEntry[]> {
  let targetDate: string | null = null;
  
  if (dateMatch) {
    const dateStr = dateMatch[1].trim();
    const parsedDate = parse(dateStr, 'EEEE, MMMM d, yyyy', new Date());
    targetDate = format(parsedDate, 'yyyy-MM-dd');
    console.log("Specific date journal query:");
    console.log("dateStr:", dateStr);
    console.log("parsedDate:", parsedDate);
    console.log("targetDate:", targetDate);
  }

  const response = await supabase.rpc('match_journals', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    user_id: userId,
    target_date: targetDate
  });

  if (response.error) throw response.error;
  return response.data;
}

export async function fetchJournalsByDateRange(userId: string, match: RegExpMatchArray): Promise<JournalEntry[]> {
  const startDateStr = match[1].trim();
  const endDateStr = match[2].trim();
  
  try {
    const startDate = parse(startDateStr, 'MMMM d, yyyy', new Date());
    const endDate = parse(endDateStr, 'MMMM d, yyyy', new Date());

    console.log("Date range journal query:");
    console.log("startDateStr:", startDateStr);
    console.log("endDateStr:", endDateStr);
    console.log("startDate:", startDate);
    console.log("endDate:", endDate);

    const { data, error } = await supabase.rpc('get_journal_stats_by_period', {
      p_user_id: userId,
      p_start_date: format(startDate, 'yyyy-MM-dd'),
      p_end_date: format(endDate, 'yyyy-MM-dd')
    });

    if (error) throw error;
    if (!data) return [];

    // Process the entries to ensure all required fields are present
    return data.map((entry: JournalEntry) => ({
      ...entry,
      mood_tags: entry.mood_tags || [],
      tags: entry.tags || [],
      keywords: entry.keywords || []
    }));

  } catch (error) {
    console.error("Error fetching date range:", error);
    throw error;
  }
}

export function formatJournalEntries(entries: JournalEntry[] | null | undefined): string {
  // Check if entries exists and is an array
  if (!entries || !Array.isArray(entries)) {
    console.log("No entries found or invalid entries format:", entries);
    return "No journal entries found.";
  }

  // Check if array is empty
  if (entries.length === 0) {
    return "No journal entries found.";
  }

  const formattedEntries = entries
    .map(entry => `Journal Entry (${new Date(entry.created_at).toLocaleDateString()}):
    Title: ${entry.title || 'Untitled'}
    Content: ${entry.content || 'No content'}
    Summary: ${entry.summary || 'No summary'}
    Mood Tags: ${(entry.mood_tags || []).join(", ") || 'No mood tags'}
    Tags: ${(entry.tags || []).join(", ") || 'No tags'}
    Keywords: ${(entry.keywords || []).join(", ") || 'No keywords'}
    Song: ${entry.song || 'No song'}`)
    .join("\n\n");

  return formattedEntries;
} 