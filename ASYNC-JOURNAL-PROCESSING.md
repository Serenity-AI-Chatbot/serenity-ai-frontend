# Asynchronous Journal Processing Implementation

This document describes the implementation of asynchronous journal processing in the application.

## Overview

Previously, when a user submitted a journal entry, the application would wait for the Flask API to process the content and return a response before saving the journal to the database. This could take several seconds, leading to a poor user experience.

The new implementation creates an empty journal entry immediately, then sends the journal content to the Flask API for asynchronous processing. The Flask API processes the content in the background and sends the results back to a webhook endpoint in our application.

## Implementation Details

### 1. Webhook Endpoint

Created a new webhook endpoint at `/api/journal/webhook` that:
- Receives processed journal data from the Flask API
- Updates the corresponding journal entry in the database
- Generates embeddings for the updated journal
- Sets `is_processing` to false

### 2. Journal POST API

Updated the journal creation endpoint to:
- Create an initial journal entry with minimal data and `is_processing: true`
- Send the journal content to the Flask API asynchronously along with the journal ID and webhook URL
- Return immediately with a processing status

### 3. Frontend Updates

Updated the frontend components to:
- Display a processing state in the journal entry form after submission
- Show a visual indicator for processing journals in the journal history list
- Automatically refresh the journal list periodically to check for completed processing

### 4. Data Model Updates

Updated the `JournalEntry` type to include a new field:
- `is_processing`: Boolean flag indicating whether the journal is still being processed

## Flask API Changes

The Flask API now supports asynchronous processing through a new endpoint:
- `/journal-async`: Accepts journal content and a webhook URL, processes the content in the background, and sends the results to the webhook URL

## Flow

1. User submits a journal entry
2. Frontend sends the data to the API
3. API creates a minimal journal record with `is_processing: true`
4. API sends content to Flask for async processing
5. API returns success to the user with processing status
6. Frontend shows processing indicator
7. Flask API processes content in the background
8. Flask API sends processed data to webhook URL
9. Webhook updates the journal in the database
10. Frontend periodically checks for updates and refreshes when complete

## Benefits

- Improved user experience - no waiting for processing to complete
- More reliable - background processing can retry on failure
- Scalable - processing can be distributed across multiple workers

## Testing

To test the async processing:
1. Submit a new journal entry
2. Observe the processing indicator in the journal form
3. Switch to the history view to see the processing journal
4. Wait for the processing to complete (the journal should update automatically) 