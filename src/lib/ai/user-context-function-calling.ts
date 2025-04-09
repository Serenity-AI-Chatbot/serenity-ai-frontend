import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveUserContext } from "./user-context";

/**
 * Extract user context from a message using function calling
 * 
 * @param userId User ID to associate with the context
 * @param userMessage The message to analyze
 * @returns Boolean indicating if any context was extracted
 */
export async function extractUserContext(
  userId: string,
  userMessage: string
): Promise<boolean> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing Gemini API key");
    return false;
  }
  
  try {
    console.log("Extracting user context for user:", userId);
    console.log("User message:", userMessage);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Explicitly cast to any to bypass TypeScript type checking
    const contextModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
      },
      tools: [{
        functionDeclarations: [{
          name: "save_user_context",
          description: "Save information about entities mentioned by the user to enhance future conversations.",
          parameters: {
            type: "object",
            properties: {
              entity_name: {
                type: "string",
                description: "The name of the entity (e.g., 'John', 'Mom', 'Work Project')"
              },
              entity_type: {
                type: "string",
                description: "The type of entity (e.g., 'person', 'location', 'project', 'event')"
              },
              information: {
                type: "object",
                description: "Structured information about the entity extracted from the conversation",
                properties: {
                  description: { 
                    type: "string",
                    description: "Brief description of the entity" 
                  },
                  relationship: { 
                    type: "string",
                    description: "Relationship to the user" 
                  },
                  preferences: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Things they like or dislike"
                  },
                  important_dates: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Important dates related to this entity"
                  },
                  notes: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Additional notes about the entity"
                  }
                }
              },
              relevance_score: {
                type: "number",
                description: "Score from 0 to 1 indicating how important/relevant this entity is to the user"
              }
            },
            required: ["entity_name", "entity_type", "information"]
          }
        }]
      }]
    } as any);
     
    // Analyze the message for potential context to save
    const contextAnalysisResult = await contextModel.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ 
          text: `${SYSTEM_PROMPT_FOR_CONTEXT}\n\nUser message: "${userMessage}"` 
        }] 
      }]
    });
    
    // Process any function calls to save context
    const response = contextAnalysisResult.response;
    console.log("User context response:", response);
    
    // Try extracting function call data directly from the response structure
    // based on the log output which shows the structure
    const candidates = response.candidates;
    let savedAnyContext = false;
    
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        // Process each part that may contain a function call
        for (const part of content.parts) {
          if (part.functionCall) {
            const functionCall = part.functionCall;
            if (functionCall.name === "save_user_context") {
              const args = functionCall.args as {
                entity_name: string;
                entity_type: string;
                information: Record<string, any>;
                relevance_score?: number;
              };
              
              console.log("Saving user context:", args);
              await saveUserContext(
                userId,
                args.entity_name,
                args.entity_type,
                args.information,
                args.relevance_score || 0.8
              );
              savedAnyContext = true;
              // Don't return here - continue processing all function calls
            }
          }
        }
      }
    }
    
    return savedAnyContext;
  } catch (error) {
    console.error("Error extracting user context:", error);
    return false;
  }
}

const SYSTEM_PROMPT_FOR_CONTEXT = `
You are an AI assistant focused on identifying and extracting relevant personal context from user messages.

Your task is to analyze user messages and identify any important entity information that should be saved for future reference.
This includes information about:
- People (friends, family, colleagues)
- Locations (home, work, favorite places)
- Events (birthdays, anniversaries, meetings)
- Preferences (likes, dislikes, routines)
- Projects (work, personal)

When you identify relevant context, call the save_user_context function with the extracted information.
Only extract context that seems important and relevant for future conversations.
Be selective and prioritize quality over quantity.
Do not extract context from hypothetical scenarios or general discussions.
Focus on specific, concrete information that is unique to this user.

If you don't find relevant context to save, don't call the function at all.
`; 