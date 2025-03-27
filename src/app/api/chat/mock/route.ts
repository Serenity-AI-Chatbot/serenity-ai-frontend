import { NextResponse } from 'next/server';

// Mock responses for testing
const MOCK_RESPONSES = [
  "I understand what you're saying. Could you tell me more about that?",
  "That's interesting! How does that make you feel?",
  "I hear you. What would you like to explore further?",
  "Thank you for sharing that with me. Would you like to elaborate?",
  "I'm here to listen and support you. What's on your mind?",
  "It sounds like you're going through a lot. How are you coping with that?",
  "I appreciate you sharing this with me. What do you think would help?",
  "Your feelings are valid. Would you like to talk more about this?",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    // Log the incoming request for debugging
    console.log('Received chat request:', messages);

    // Don't process empty messages
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content || lastMessage.content.trim() === "") {
      return new NextResponse(
        'data: {"text": "I couldn\'t hear you clearly. Could you please try speaking again?"}\n\n',
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Get a random mock response
    const mockResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];

    // Simulate streaming response by sending characters one by one
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Add a small initial delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 300));

        for (const char of mockResponse) {
          const chunk = encoder.encode(`data: {"text": "${char}"}\n\n`);
          controller.enqueue(chunk);
          // Add a small delay between characters to simulate typing
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Mock Chat API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 