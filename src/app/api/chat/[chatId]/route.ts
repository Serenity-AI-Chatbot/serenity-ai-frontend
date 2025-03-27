import { requireAuth, supabase } from "@/lib/supabase-server";
import { cache } from "@/lib/cache";

export const runtime = "edge";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
  const { session } = await requireAuth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const chatId = (await params).chatId;

  if (!chatId) {
    return new Response("Chat ID is required", { status: 400 });
  }

  try {
    // Try to get from cache first
    const cacheKey = `chat_messages_${chatId}_${userId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log("----------Cache hit---------- [chatId]",chatId);
      return new Response(JSON.stringify(cachedData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase.rpc('get_chat_messages', {
      p_chat_id: chatId,
      p_user_id: userId
    });

    if (error) {
      if (error.message.includes('Chat not found or access denied')) {
        return new Response("Chat not found or access denied", { status: 403 });
      }
      throw error;
    }

    // Cache the result for 5 minutes
    cache.set(cacheKey, data);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("Error fetching chat messages:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { session } = await requireAuth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const chatId = (await params).chatId;

  if (!chatId) {
    return new Response("Chat ID is required", { status: 400 });
  }

  try {
    // Delete the chat using RPC function (assuming you have this function in your database)
    // If you don't have an RPC function, you can use a direct query instead
    const { data, error } = await supabase.rpc('delete_chat', {
      p_chat_id: chatId,
      p_user_id: userId
    });

    if (error) {
      if (error.message.includes('Chat not found or access denied')) {
        return new Response("Chat not found or access denied", { status: 403 });
      }
      throw error;
    }

    // Clear cache for this chat
    const cacheKey = `chat_messages_${chatId}_${userId}`;
    cache.delete(cacheKey);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("Error deleting chat:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 