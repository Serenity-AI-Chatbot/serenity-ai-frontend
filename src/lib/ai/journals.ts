import { supabase } from "@/lib/supabase-server";
import { format, parse } from "date-fns";
import { generateEmbedding } from "./client";
import {
  JournalEntry,
  JournalQueryResult,
  MoodAnalysis,
  datePatterns,
} from "./types";
import { analyzeMoodPatterns } from "./mood-analysis";
import {
  combinedFunctionCalling,
  processUserContextItems,
} from "./user-context-function-calling";

export async function fetchRelevantJournalEntries(
  userId: string,
  userMessage: string
): Promise<JournalQueryResult> {
  try {
    // Use a single AI call to handle both user context extraction and journal query method
    const combinedResult = await combinedFunctionCalling(userId, userMessage);
    console.log("Combined AI function calling result:", combinedResult);

    // Process any extracted user context
    if (combinedResult.userContext && combinedResult.userContext.length > 0) {
      await processUserContextItems(userId, combinedResult.userContext);
    }

    // Get journal query method from combined result
    const journalQueryMethod = combinedResult.journalQuery || {
      name: "fetch_recent",
      args: { limit: 10 },
    };
    console.log("AI determined journal query method:", journalQueryMethod);

    let entries: JournalEntry[] = [];

    // Based on the function call returned, fetch the appropriate journals
    if (journalQueryMethod.name === "fetch_by_date_range") {
      const { startDate, endDate } = journalQueryMethod.args;
      entries = await fetchJournalsByDateRange(userId, startDate, endDate);
    } else if (journalQueryMethod.name === "fetch_by_month_year") {
      const { month, year } = journalQueryMethod.args;
      entries = await fetchJournalsByMonthYear(userId, month, year);
    } else if (journalQueryMethod.name === "fetch_by_specific_date") {
      const { date } = journalQueryMethod.args;
      const queryEmbedding = await generateEmbedding(userMessage);
      entries = await fetchJournalsBySpecificDate(userId, date, queryEmbedding);
    } else if (journalQueryMethod.name === "fetch_by_semantic_search") {
      const queryEmbedding = await generateEmbedding(userMessage);
      entries = await fetchJournalsBySemantic(userId, queryEmbedding);
    } else {
      // Default to fetching latest journals
      entries = await fetchLastTenJournals(userId);
    }

    return {
      entries: Array.isArray(entries) ? entries : [],
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

export async function fetchLastTenJournals(
  userId: string
): Promise<JournalEntry[]> {
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

export async function fetchLatestJournals(
  userId: string,
  limit: number
): Promise<JournalEntry[]> {
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

export async function fetchJournalsByMonthYear(
  userId: string,
  month?: number,
  year?: number
): Promise<JournalEntry[]> {
  console.log("Monthly/Yearly journal query:");
  console.log("month:", month);
  console.log("year:", year);

  const response = await supabase.rpc("get_journals_by_date", {
    p_user_id: userId,
    p_year: year || null,
    p_month: month || null,
  });

  if (response.error) throw response.error;
  return response.data;
}

export async function fetchJournalsBySpecificDate(
  userId: string,
  dateStr: string,
  queryEmbedding: number[]
): Promise<JournalEntry[]> {
  try {
    const parsedDate = parse(dateStr, "MMMM d, yyyy", new Date());
    const targetDate = format(parsedDate, "yyyy-MM-dd");

    console.log("Specific date journal query:");
    console.log("dateStr:", dateStr);
    console.log("parsedDate:", parsedDate);
    console.log("targetDate:", targetDate);

    const response = await supabase.rpc("match_journals", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      user_id: userId,
      target_date: targetDate,
    });

    if (response.error) throw response.error;
    return response.data;
  } catch (error) {
    console.error("Error parsing date:", error);
    // If date parsing fails, fall back to semantic search
    return fetchJournalsBySemantic(userId, queryEmbedding);
  }
}

export async function fetchJournalsBySemantic(
  userId: string,
  queryEmbedding: number[]
): Promise<JournalEntry[]> {
  console.log("Semantic journal query");

  const response = await supabase.rpc("match_journals", {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    user_id: userId,
    target_date: null,
  });

  console.log("Semantic journal query response:", response);

  if (response.error) throw response.error;
  return response.data;
}

export async function fetchJournalsByDateRange(
  userId: string,
  startDateStr: string,
  endDateStr: string
): Promise<JournalEntry[]> {
  try {
    const startDate = parse(startDateStr, "MMMM d, yyyy", new Date());
    const endDate = parse(endDateStr, "MMMM d, yyyy", new Date());

    console.log("Date range journal query:");
    console.log("startDateStr:", startDateStr);
    console.log("endDateStr:", endDateStr);
    console.log("startDate:", startDate);
    console.log("endDate:", endDate);

    const { data, error } = await supabase.rpc("get_journal_stats_by_period", {
      p_user_id: userId,
      p_start_date: format(startDate, "yyyy-MM-dd"),
      p_end_date: format(endDate, "yyyy-MM-dd"),
    });

    if (error) throw error;
    if (!data) return [];

    // Process the entries to ensure all required fields are present
    return data.map((entry: JournalEntry) => ({
      ...entry,
      mood_tags: entry.mood_tags || [],
      tags: entry.tags || [],
      keywords: entry.keywords || [],
    }));
  } catch (error) {
    console.error("Error fetching date range:", error);
    throw error;
  }
}

export function formatJournalEntries(
  entries: JournalEntry[] | null | undefined
): string {
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
    .map(
      (entry) => `Journal Entry (${new Date(
        entry.created_at
      ).toLocaleDateString()}):
    Title: ${entry.title || "Untitled"}
    Content: ${entry.content || "No content"}
    Summary: ${entry.summary || "No summary"}
    Mood Tags: ${(entry.mood_tags || []).join(", ") || "No mood tags"}
    Tags: ${(entry.tags || []).join(", ") || "No tags"}
    Keywords: ${(entry.keywords || []).join(", ") || "No keywords"}
    Song: ${entry.song || "No song"}`
    )
    .join("\n\n");

  return formattedEntries;
}
