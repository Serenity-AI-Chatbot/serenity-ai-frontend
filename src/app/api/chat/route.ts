import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Gemini model with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Set the runtime to edge for better performance
export const runtime = "edge"

const SYSTEM_PROMPT = `You are an AI assistant for a mental wellness app called MindfulAI. Your primary goal is to help users improve their mental well-being. Respond with empathy, compassion, and understanding. Offer supportive advice, coping strategies, and gentle encouragement. If a user expresses severe distress or mentions self-harm, always recommend professional help. Remember, you're not a replacement for professional mental health care, but a supportive tool for users' day-to-day emotional well-being.`

export async function POST(req: Request) {
  // Add error handling for missing API key
  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing API key", { status: 500 })
  }

  const { messages } = await req.json()
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  // Create messages with the correct format
  const geminiMessages = [
    {
      role: 'user',
      parts: [{ text: 'Initialize chat' }]
    },
    {
      role: 'model',
      parts: [{ text: SYSTEM_PROMPT }]
    },
    ...messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))
  ]

  const chat = model.startChat({
    history: geminiMessages,
  })

  const result = await chat.sendMessageStream(messages[messages.length - 1].content)
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          // Ensure we're sending the chunks in the correct format for the useChat hook
          controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`);
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

