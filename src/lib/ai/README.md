# AI Module for Serenity AI

This module provides a modular and reusable implementation of AI functionality for the Serenity AI application. It's designed to be used with different interfaces, including web chat and Telegram.

## Directory Structure

- `client.ts` - Core AI client setup with GoogleGenerativeAI
- `prompts.ts` - System prompts for different personas
- `types.ts` - TypeScript interfaces used throughout the modules
- `journals.ts` - Functions for fetching and formatting journal entries
- `mood-analysis.ts` - Functions for analyzing mood patterns
- `activities.ts` - Functions for activities and recommendations
- `chat.ts` - Functions for handling chat interactions

## Usage

### Importing the modules

```typescript
import { getGeminiModel } from "@/lib/ai/client";
import { ChatMessage } from "@/lib/ai/types";
import { fetchRelevantJournalEntries } from "@/lib/ai/journals";
import { prepareChatMessages } from "@/lib/ai/chat";
```

### Basic flow for an AI conversation

1. Get a model instance:

```typescript
const model = getGeminiModel("gemini-2.0-flash");
```

2. Fetch relevant user data:

```typescript
const { entries, moodAnalysis, recommendations } = 
  await fetchRelevantJournalEntries(userId, userMessage);
const activities = await fetchActivities();
```

3. Format data for the AI:

```typescript
const journalContext = formatJournalEntries(entries);
const activitiesContext = formatActivities(activities);
```

4. Prepare chat messages:

```typescript
const geminiMessages = prepareChatMessages(
  messages,
  journalContext,
  activitiesContext,
  moodAnalysis,
  recommendations,
  chatHistory
);
```

5. Get a response:

```typescript
const chat = model.startChat({ history: geminiMessages });
const result = await chat.sendMessage(userMessage);
const aiResponse = result.response.text();
```

## Examples

### Web Chat Implementation

See `src/app/api/chat/route.ts` for a complete example of using this module for a web chat interface with streaming responses.

### Telegram Bot Implementation

See `src/app/api/telegram/route.ts` for an example of using this module with a Telegram bot integration.

## Extending

To add new functionality:

1. Add new interfaces to `types.ts`
2. Create new utility functions in the appropriate file
3. Export the functions for use in other modules

## Configuration

The module requires the following environment variables:

- `GEMINI_API_KEY` - Google Gemini API key
- For Telegram: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` 