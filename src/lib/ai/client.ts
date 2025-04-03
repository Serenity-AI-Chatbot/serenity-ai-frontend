import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini model with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "embedding-001" });
  const result = await model.embedContent(text);
  const embedding = result.embedding.values;
  return embedding;
}

export function getGeminiModel(modelName: string = "gemini-2.0-flash") {
  return genAI.getGenerativeModel({ model: modelName });
}

export default genAI; 