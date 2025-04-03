import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/ai/client";
import { supabase } from "@/lib/supabase-server";
import { ChatMessage } from "@/lib/ai/types";
import { fetchRelevantJournalEntries } from "@/lib/ai/journals";
import { fetchActivities } from "@/lib/ai/activities";
import { formatJournalEntries } from "@/lib/ai/journals";
import { formatActivities } from "@/lib/ai/activities";
import { prepareChatMessages, generateChatTitle, handleError } from "@/lib/ai/chat";

// Set the runtime to edge for better performance
export const runtime = "edge";

// Define Telegram types
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramMessageDB {
  id?: string;
  telegram_chat_id: string;
  telegram_user_id: string;
  message_id?: number;
  content: string;
  is_bot: boolean;
  created_at?: string;
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY || !process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Missing API keys", { status: 500 });
  }

  // Parse the incoming Telegram update
  const telegramUpdate: TelegramUpdate = await req.json();
  const message = telegramUpdate.message;

  if (!message || !message.text) {
    return new Response("No message content", { status: 400 });
  }

  try {
    // Get or create user
    const telegramUserId = message.from.id.toString();
    const { data: userData, error: userError } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', telegramUserId)
      .single();

    let userId: string;
    
    if (userError || !userData) {
      // Create a new user
      const { data: newUser, error: createError } = await supabase
        .from('telegram_users')
        .insert({
          telegram_id: telegramUserId,
          first_name: message.from.first_name,
          last_name: message.from.last_name,
          username: message.from.username
        })
        .select('id')
        .single();

      if (createError || !newUser) {
        throw new Error("Failed to create Telegram user");
      }
      userId = newUser.id;
    } else {
      if (!userData.id) {
        throw new Error("User data missing ID");
      }
      userId = userData.id;
    }

    // Fetch previous messages for context (last 10 messages)
    const { data: chatHistory, error: chatError } = await supabase
      .from('telegram_messages')
      .select('*')
      .eq('telegram_chat_id', message.chat.id.toString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (chatError) throw chatError;

    // Format chat history for the AI
    const formattedMessages: ChatMessage[] = chatHistory
      ? chatHistory
          .sort((a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime())
          .map(msg => ({
            role: msg.is_bot ? "assistant" : "user",
            content: msg.content
          }))
      : [];
    
    // Add the current message
    formattedMessages.push({
      role: "user",
      content: message.text
    });

    // Get journal entries and activities based on user message
    const { entries, moodAnalysis, recommendations } = await fetchRelevantJournalEntries(userId, message.text);
    const activities = await fetchActivities();

    // Format contexts
    const journalContext = formatJournalEntries(entries);
    const activitiesContext = formatActivities(activities);

    // Create chat history context for Gemini
    const chatHistoryContext = formattedMessages.slice(0, formattedMessages.length - 1)
      .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Prepare the AI message
    const geminiMessages = prepareChatMessages(
      formattedMessages, 
      journalContext, 
      activitiesContext, 
      moodAnalysis, 
      recommendations, 
      chatHistoryContext
    );

    // Get response from AI
    const model = getGeminiModel("gemini-2.0-flash");
    const chat = model.startChat({ history: geminiMessages });
    const result = await chat.sendMessage(message.text);
    const aiResponse = result.response.text();

    // Prepare message data with proper type safety
    const messagesToInsert: TelegramMessageDB[] = [
      {
        telegram_chat_id: message.chat.id.toString(),
        telegram_user_id: telegramUserId,
        message_id: message.message_id,
        content: message.text,
        is_bot: false,
        created_at: new Date(message.date * 1000).toISOString()
      },
      {
        telegram_chat_id: message.chat.id.toString(),
        telegram_user_id: telegramUserId,
        content: aiResponse,
        is_bot: true,
        created_at: new Date().toISOString()
      }
    ];

    // Save the messages to the database
    await supabase.from('telegram_messages').insert(messagesToInsert);

    // Send response back to Telegram
    await sendTelegramMessage(message.chat.id, aiResponse);
    
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing Telegram message:", error);
    return handleError(error);
  }
}

// Helper function to send message back to Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(telegramApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
} 