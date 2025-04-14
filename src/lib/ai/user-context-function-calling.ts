import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveUserContext } from "./user-context";

// Interface for combined function calling result
export interface CombinedFunctionResult {
  journalQuery?: {
    name: string;
    args: Record<string, any>;
  };
  userContext?: Array<{
    entity_name: string;
    entity_type: string;
    information: Record<string, any>;
    relevance_score?: number;
  }>;
}

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

/**
 * Combined function calling for both user context extraction and journal query method
 * 
 * @param userId User ID to associate with the context
 * @param userMessage The message to analyze
 * @returns Combined result with journal query method and user context
 */
export async function combinedFunctionCalling(
  userId: string, 
  userMessage: string
): Promise<CombinedFunctionResult> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing Gemini API key");
    return { 
      journalQuery: { name: "fetch_recent", args: { limit: 10 } }
    };
  }
  
  try {
    console.log("Running combined function calling for user:", userId);
    console.log("User message:", userMessage);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Create a model with function calling capabilities for both user context and journal queries
    const combinedModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
      },
      tools: [{
        functionDeclarations: [
          // Journal query functions
          {
            name: "fetch_by_date_range",
            description: "Fetch journal entries within a specific date range",
            parameters: {
              type: "object",
              properties: {
                startDate: {
                  type: "string",
                  description: "The start date in format 'MMMM d, yyyy' (e.g., 'January 1, 2023')"
                },
                endDate: {
                  type: "string",
                  description: "The end date in format 'MMMM d, yyyy' (e.g., 'January 31, 2023')"
                }
              },
              required: ["startDate", "endDate"]
            }
          }, 
          {
            name: "fetch_by_month_year",
            description: "Fetch journal entries for a specific month and/or year",
            parameters: {
              type: "object",
              properties: {
                month: {
                  type: "integer",
                  description: "The month number (1-12)"
                },
                year: {
                  type: "integer",
                  description: "The year (e.g., 2023)"
                }
              }
            }
          }, 
          {
            name: "fetch_by_specific_date",
            description: "Fetch journal entries for a specific date",
            parameters: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "The date in format 'MMMM d, yyyy' (e.g., 'January 15, 2023')"
                }
              },
              required: ["date"]
            }
          }, 
          {
            name: "fetch_by_semantic_search",
            description: "Fetch journal entries related to the topic using semantic search",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The query to search for semantically similar journal entries"
                }
              },
              required: ["query"]
            }
          }, 
          {
            name: "fetch_recent",
            description: "Fetch the most recent journal entries",
            parameters: {
              type: "object",
              properties: {
                limit: {
                  type: "integer",
                  description: "The number of recent entries to fetch"
                }
              }
            }
          },
          // User context function
          {
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
          }
        ]
      }]
    } as any);
     
    // Analyze the message for both journal query and user context in one call
    const combinedResult = await combinedModel.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ 
          text: `${COMBINED_SYSTEM_PROMPT}\n\nUser message: "${userMessage}"` 
        }] 
      }]
    });
    
    // Process function calls
    const response = combinedResult.response;
    const candidates = response.candidates;
    
    let result: CombinedFunctionResult = {};
    const userContextEntities: Array<any> = [];
    
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        // Process each function call
        for (const part of content.parts) {
          if (part.functionCall) {
            const functionCall = part.functionCall;
            
            // Handle journal query functions
            if (["fetch_by_date_range", "fetch_by_month_year", "fetch_by_specific_date", 
                 "fetch_by_semantic_search", "fetch_recent"].includes(functionCall.name)) {
              result.journalQuery = {
                name: functionCall.name,
                args: functionCall.args as Record<string, any>
              };
            }
            
            // Handle user context function
            if (functionCall.name === "save_user_context") {
              userContextEntities.push(functionCall.args);
            }
          }
        }
      }
    }
    
    // Add user context to result if any was found
    if (userContextEntities.length > 0) {
      result.userContext = userContextEntities;
    }
    
    // Ensure we have a default journal query if none was detected
    if (!result.journalQuery) {
      result.journalQuery = { name: "fetch_recent", args: { limit: 10 } };
    }
    
    return result;
  } catch (error) {
    console.error("Error in combined function calling:", error);
    return { 
      journalQuery: { name: "fetch_recent", args: { limit: 10 } }
    };
  }
}

// Process user context items from the combined function result
export async function processUserContextItems(
  userId: string,
  contextItems?: Array<{
    entity_name: string;
    entity_type: string;
    information: Record<string, any>;
    relevance_score?: number;
  }>
): Promise<boolean> {
  if (!contextItems || contextItems.length === 0) {
    return false;
  }
  
  try {
    let savedAny = false;
    for (const item of contextItems) {
      console.log("Processing user context item:", item.entity_name);
      await saveUserContext(
        userId,
        item.entity_name,
        item.entity_type,
        item.information,
        item.relevance_score || 0.8
      );
      savedAny = true;
    }
    return savedAny;
  } catch (error) {
    console.error("Error processing user context items:", error);
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

// Combined system prompt for both user context extraction and journal query
const COMBINED_SYSTEM_PROMPT = `
You are an AI assistant with two responsibilities:

1. DETERMINE THE APPROPRIATE JOURNAL QUERY METHOD
Analyze the user's message and select the most appropriate function to fetch journal entries:
- If the user asks for entries within a specific date range (between two dates), use fetch_by_date_range
- If the user asks for entries from a specific month and/or year, use fetch_by_month_year
- If the user asks for entries from a specific date, use fetch_by_specific_date
- If the user asks for entries related to a topic, emotion, or keyword without specifying dates, use fetch_by_semantic_search
- If the user just wants to see recent entries or doesn't specify any criteria, use fetch_recent

Format dates as 'Month Day, Year' (e.g., 'January 15, 2023').
For month/year queries, provide the month as a number (1-12) and year as a four-digit number.

2. EXTRACT USER CONTEXT
Identify and extract important personal context from the user's message, including:
- People (friends, family, colleagues)
- Locations (home, work, favorite places)
- Events (birthdays, anniversaries, meetings)
- Preferences (likes, dislikes, routines)
- Projects (work, personal)

When you identify relevant context, call the save_user_context function with the extracted information.
Only extract context that seems important and relevant for future conversations.
Be selective and prioritize quality over quantity.
Do not extract context from hypothetical scenarios or general discussions.

YOU MUST PERFORM BOTH TASKS IN A SINGLE RESPONSE. First determine the journal query method, then extract any user context.
If no relevant user context is found, only return the journal query function.
`; 