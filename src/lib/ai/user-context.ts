import { supabase } from '@/lib/supabase-server';
import { UserContext, UserContextSaveResult } from './types';

/**
 * Saves user context information to the database
 * 
 * @param userId The user ID
 * @param entityName The name of the entity (e.g., "John", "Mom", "Work Project")
 * @param entityType The type of entity (e.g., "person", "location", "project")
 * @param information Object containing relevant information about the entity
 * @param relevanceScore Optional score indicating how relevant this entity is
 * @returns Result of the save operation
 */
export async function saveUserContext(
  userId: string,
  entityName: string, 
  entityType: string,
  information: Record<string, any>,
  relevanceScore: number = 0.8
): Promise<UserContextSaveResult> {
  try {
    // Check if entity already exists for this user
    const { data: existingData, error: fetchError } = await supabase
      .from('user_context')
      .select('*')
      .eq('user_id', userId)
      .eq('entity_name', entityName)
      .eq('entity_type', entityType)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw fetchError;
    }
    
    let result;
    
    if (existingData) {
      console.log("Existing information for entity:", entityName, existingData.information);
      console.log("New information for entity:", entityName, information);
      
      // Update existing entity with properly merged information
      const mergedInfo = mergeInformation(existingData.information, information);
      console.log("Merged information for entity:", entityName, mergedInfo);
      
      const { data, error } = await supabase
        .from('user_context')
        .update({
          information: mergedInfo,
          relevance_score: relevanceScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select()
        .single();
        
      if (error) throw error;
      
      result = {
        success: true,
        message: 'Context updated successfully',
        context: data
      };
    } else {
      // Insert new entity
      const { data, error } = await supabase
        .from('user_context')
        .insert({
          user_id: userId,
          entity_name: entityName,
          entity_type: entityType,
          information: information,
          relevance_score: relevanceScore
        })
        .select()
        .single();
        
      if (error) throw error;
      
      result = {
        success: true,
        message: 'Context created successfully',
        context: data
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error saving user context:', error);
    return {
      success: false,
      message: `Failed to save context: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Fetches user context information that might be relevant to the user message
 * 
 * @param userId The user ID
 * @param userMessage The message to find relevant context for
 * @returns Array of relevant user context items
 */
export async function fetchRelevantUserContext(
  userId: string,
  userMessage: string
): Promise<UserContext[]> {
  try {
    console.log("Fetching user context for message:", userMessage);
    
    // First, try to fetch all context for this user
    const { data: allUserContext, error: allContextError } = await supabase
      .from('user_context')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (allContextError) throw allContextError;
    
    if (!allUserContext || allUserContext.length === 0) {
      console.log("No user context found for this user");
      return [];
    }
    
    console.log(`Found ${allUserContext.length} total context items for user`);
    
    // Extract keywords for better matching
    const keywords = extractKeywords(userMessage);
    const lowerMessage = userMessage.toLowerCase();
    
    // Score each context item for relevance to the current message
    const scoredContexts = allUserContext.map(context => {
      let score = 0;
      const entityNameLower = context.entity_name.toLowerCase();
      const entityTypeLower = context.entity_type.toLowerCase();
      
      // Direct entity name match is highest priority
      if (lowerMessage.includes(entityNameLower)) {
        score += 10;
      }
      
      // Check for partial matches in entity name (for names with multiple parts)
      const nameParts = entityNameLower.split(/\s+/);
      for (const part of nameParts) {
        if (part.length > 2 && lowerMessage.includes(part)) {
          score += 5;
        }
      }
      
      // Check for entity type references (e.g. "friend", "place", etc.)
      if (lowerMessage.includes(entityTypeLower)) {
        score += 3;
      }
      
      // Check for keyword matches in the information
      const infoString = JSON.stringify(context.information).toLowerCase();
      for (const keyword of keywords) {
        if (infoString.includes(keyword)) {
          score += 2;
        }
        
        // Extra points if the keyword is in the entity name
        if (entityNameLower.includes(keyword)) {
          score += 2;
        }
      }
      
      // Add the base relevance score that was saved with the context
      score += (context.relevance_score || 0.5) * 2;
      
      return { context, score };
    });
    
    // Sort by score and take the top results
    const topContexts = scoredContexts
      .filter(item => item.score > 1) // Only include items with some relevance
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Limit to top 5 most relevant contexts
      .map(item => item.context);
    
    console.log(`Returning ${topContexts.length} relevant context items`);
    if (topContexts.length > 0) {
      console.log("Top context items:", topContexts.map(c => c.entity_name).join(", "));
    }
    
    return topContexts;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return [];
  }
}

/**
 * Format user context for inclusion in AI prompt
 * 
 * @param contextItems Array of user context items
 * @returns Formatted context string
 */
export function formatUserContext(contextItems: UserContext[]): string {
  if (contextItems.length === 0) {
    return '';
  }
  
  // Group contexts by type for better organization
  const contextsByType: Record<string, UserContext[]> = {};
  
  contextItems.forEach(item => {
    if (!contextsByType[item.entity_type]) {
      contextsByType[item.entity_type] = [];
    }
    contextsByType[item.entity_type].push(item);
  });
  
  // Format each type with its entities
  const formattedTypes = Object.entries(contextsByType).map(([type, items]) => {
    const typeHeader = `== ${type.toUpperCase()} ==`;
    
    const formattedItems = items.map(item => {
      // Format the information object in a more readable way
      const info = item.information;
      let infoText = '';
      
      if (info.description) {
        infoText += `Description: ${info.description}\n`;
      }
      
      if (info.relationship) {
        infoText += `Relationship: ${info.relationship}\n`;
      }
      
      if (info.preferences && Array.isArray(info.preferences) && info.preferences.length > 0) {
        infoText += `Preferences: ${info.preferences.join(', ')}\n`;
      }
      
      if (info.important_dates && Array.isArray(info.important_dates) && info.important_dates.length > 0) {
        infoText += `Important Dates: ${info.important_dates.join(', ')}\n`;
      }
      
      if (info.notes && Array.isArray(info.notes) && info.notes.length > 0) {
        infoText += `Notes: ${info.notes.join(', ')}\n`;
      }
      
      // For other fields not specifically handled
      Object.entries(info).forEach(([key, value]) => {
        if (!['description', 'relationship', 'preferences', 'important_dates', 'notes'].includes(key)) {
          infoText += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${
            Array.isArray(value) ? value.join(', ') : value
          }\n`;
        }
      });
      
      return `${item.entity_name}:\n${infoText.trim()}`;
    });
    
    return `${typeHeader}\n${formattedItems.join('\n\n')}`;
  });
  
  return `
=== USER CONTEXT ===
Use this information to provide personalized responses.

${formattedTypes.join('\n\n')}
  `.trim();
}

/**
 * Simple keyword extraction function
 * In a production app, you would use more sophisticated NLP techniques
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'to', 'from', 'in',
    'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
    'will', 'just', 'don', 'should', 'now', 'i', 'me', 'my', 'myself', 'we',
    'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
    'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its',
    'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'would', 'should', 'could', 'ought', 'i\'m', 'you\'re',
    'he\'s', 'she\'s', 'it\'s', 'we\'re', 'they\'re', 'i\'ve', 'you\'ve',
    'we\'ve', 'they\'ve', 'i\'d', 'you\'d', 'he\'d', 'she\'d', 'we\'d',
    'they\'d', 'i\'ll', 'you\'ll', 'he\'ll', 'she\'ll', 'we\'ll', 'they\'ll',
    'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t', 'hasn\'t', 'haven\'t', 'hadn\'t',
    'doesn\'t', 'don\'t', 'didn\'t', 'won\'t', 'wouldn\'t', 'shan\'t', 'shouldn\'t',
    'can\'t', 'cannot', 'couldn\'t', 'mustn\'t', 'let\'s', 'that\'s', 'who\'s',
    'what\'s', 'here\'s', 'there\'s', 'when\'s', 'where\'s', 'why\'s', 'how\'s'
  ]);
  
  // Extract words, convert to lowercase, filter out stop words
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => !stopWords.has(word) && word.length > 2);
}

/**
 * Deep merge information objects to preserve existing data
 * while adding new information
 */
function mergeInformation(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const result = { ...existing };
  
  // Process each field from the incoming information
  Object.entries(incoming).forEach(([key, value]) => {
    // If the field doesn't exist in the existing info, just add it
    if (!result[key]) {
      result[key] = value;
      return;
    }
    
    // Handle arrays - combine them without duplicates
    if (Array.isArray(result[key]) && Array.isArray(value)) {
      // Combine arrays and remove duplicates
      result[key] = [...new Set([...result[key], ...value])];
      return;
    }
    
    // Handle nested objects - recursively merge them
    if (typeof result[key] === 'object' && typeof value === 'object' && 
        !Array.isArray(result[key]) && !Array.isArray(value)) {
      result[key] = mergeInformation(result[key], value);
      return;
    }
    
    // For description and relationship fields, don't overwrite unless empty
    if (['description', 'relationship'].includes(key) && result[key] && result[key].trim() !== '') {
      // Append new information instead of replacing
      result[key] = `${result[key]}; ${value}`;
      return;
    }
    
    // For other fields, the new value takes precedence
    result[key] = value;
  });
  
  return result;
} 