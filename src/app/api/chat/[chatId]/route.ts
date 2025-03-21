import { requireAuth, supabase } from "@/lib/supabase-server";

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