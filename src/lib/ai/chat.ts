import { supabase } from "@/lib/supabase-server";
import { getGeminiModel } from "./client";
import { ChatMessage, JournalEntry, MoodAnalysis, ActivityRecommendation } from "./types";
import { formatJournalEntries } from "./journals";
import { formatMoodProgression } from "./mood-analysis";
import { formatActivities, formatRecommendations } from "./activities";
import SYSTEM_PROMPT from "./prompts";

export function prepareChatMessages(
  messages: ChatMessage[], 
  journalContext: string, 
  activitiesContext: string, 
  moodAnalysis: MoodAnalysis, 
  recommendations: ActivityRecommendation[], 
  chatHistory: string
) {
  const enhancedContext = `
    Journal Context:
    ${journalContext}
    
    Mood Analysis:
    - Dominant Mood: ${moodAnalysis.dominant_mood}
    - Recent Mood Progression:
    ${formatMoodProgression(moodAnalysis.mood_progression)}
    
    Patterns Identified:
    ${moodAnalysis.recurring_patterns.map(pattern => 
      `- ${pattern.trigger}: ${pattern.associated_moods.join(', ')}`
    ).join('\n')}
    
    Personalized Activity Recommendations:
    ${formatRecommendations(recommendations)}
    
    Available Activities:
    ${activitiesContext}
    
    Chat History:
    ${chatHistory}
  `;

  console.log("enhancedContext", enhancedContext);

  return [
    { role: "user", parts: [{ text: "Initialize chat" }] },
    { role: "model", parts: [{ text: SYSTEM_PROMPT }] },
    {
      role: "user",
      parts: [{
        text: enhancedContext
      }]
    },
    { role: "model", parts: [{ text: "Understood. I'll keep this context in mind when responding to the user." }] },
    ...messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
  ];
}

export async function streamChatResponseWithSave(model: any, geminiMessages: any[], userMessage: string, chatId: string | undefined) {
  if (!chatId) {
    throw new Error("Chat ID is required");
  }
  
  const chat = model.startChat({ history: geminiMessages });
  const result = await chat.sendMessageStream(userMessage);
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let completeAssistantMessage = '';
        
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          completeAssistantMessage += chunkText;
          
          const encoder = new TextEncoder();
          const bytes = encoder.encode(`data: ${JSON.stringify({ text: chunkText, chatId })}\n\n`);
          controller.enqueue(bytes);
        }
        
        // Save the complete assistant message to the database
        await supabase.from('chat_messages').insert({
          chat_id: chatId,
          role: 'assistant',
          content: completeAssistantMessage
        });
        
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export function generateChatTitle(message: string): string {
  // Truncate to first 30 characters if longer than 30
  let title = message.slice(0, 30);
  if (message.length > 30) {
    title += '...';
  }
  return title;
}

export async function saveUserMessage(chatId: string | undefined, content: string) {
  if (!chatId) {
    throw new Error("Chat ID is required for saving user message");
  }
  
  const userMessageData = {
    chat_id: chatId,
    role: 'user',
    content
  };
  
  return await supabase.from('chat_messages').insert(userMessageData);
}

export function handleError(error: any) {
  console.error("Error:", error);
  return new Response(
    JSON.stringify({ error: error.message || "An error occurred" }), 
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
} 