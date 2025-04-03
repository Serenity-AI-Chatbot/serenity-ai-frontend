import { NextResponse } from "next/server";

// Set the runtime to edge for better performance
export const runtime = "edge";

export async function GET(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Missing Telegram Bot Token", { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const secretToken = searchParams.get('secret');
  
  // Simple security check - you should set this in your environment variables
  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // Get the app URL for setting the webhook
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 (req.headers.get('host') ? `https://${req.headers.get('host')}` : null);
  
  if (!appUrl) {
    return new Response("Could not determine app URL", { status: 500 });
  }
  
  const webhookUrl = `${appUrl}/api/telegram`;
  
  try {
    // Register webhook with Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`;
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message"]
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(result)}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Webhook registered successfully",
      webhook_url: webhookUrl,
      telegram_response: result
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error setting webhook:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// For removing the webhook if needed
export async function DELETE(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Missing Telegram Bot Token", { status: 500 });
  }
  
  const { searchParams } = new URL(req.url);
  const secretToken = searchParams.get('secret');
  
  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  try {
    // Delete webhook from Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`;
    const response = await fetch(telegramApiUrl, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(result)}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Webhook deleted successfully",
      telegram_response: result
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 