import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

// Load environment variables
dotenv.config();

// Initialize Supabase and Gemini clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Constants
const USER_ID = '6b92d5c4-1034-44fd-8653-0f40b478d621';
const EMBEDDING_MODEL = 'embedding-001';

// Utility function to generate embeddings
async function generateEmbedding(text) {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

// Utility function to generate AI summary
async function generateSummary(text) {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Summarize this journal entry in 2-3 sentences: ${text}`);
    return result.response.text;
}

// Utility function to extract keywords
async function extractKeywords(text) {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Extract 5-7 key topics or themes from this text as single words: ${text}`);
    const response = result.response.text();
    return response.split(',').map(keyword => keyword.trim().toLowerCase());
}

// Seed Activities
async function seedActivities() {
    try {
        const activitiesData = [
            {
                title: 'Meditation',
                description: 'A mindful practice to reduce stress and increase awareness',
                category: 'mental',
                recommended_moods: ['anxious', 'stressed', 'overwhelmed'],
                difficulty_level: 'beginner',
                estimated_duration: 15,
                tags: ['mindfulness', 'relaxation']
            },
            {
                title: 'Running',
                description: 'Outdoor cardiovascular exercise to boost mood and energy',
                category: 'physical',
                recommended_moods: ['energetic', 'motivated', 'stressed'],
                difficulty_level: 'intermediate',
                estimated_duration: 45,
                tags: ['fitness', 'outdoor']
            },
            {
                title: 'Journaling',
                description: 'Expressive writing to process emotions and reflect',
                category: 'mental',
                recommended_moods: ['reflective', 'emotional', 'processing'],
                difficulty_level: 'beginner',
                estimated_duration: 20,
                tags: ['self-reflection', 'emotional-processing']
            },
            {
                title: 'Group Yoga Class',
                description: 'Social and physical activity promoting wellness',
                category: 'social',
                recommended_moods: ['social', 'energetic', 'peaceful'],
                difficulty_level: 'intermediate',
                estimated_duration: 60,
                tags: ['fitness', 'social', 'wellness']
            },
            {
                title: 'Nature Walk',
                description: 'Peaceful outdoor activity to connect with nature',
                category: 'physical',
                recommended_moods: ['peaceful', 'reflective', 'stressed'],
                difficulty_level: 'beginner',
                estimated_duration: 30,
                tags: ['outdoor', 'mindfulness']
            },
            {
                title: 'Art Therapy',
                description: 'Creative expression for emotional release',
                category: 'mental',
                recommended_moods: ['creative', 'emotional', 'processing'],
                difficulty_level: 'beginner',
                estimated_duration: 45,
                tags: ['creativity', 'self-expression']
            }
        ];

        const { error } = await supabase.from('activities').upsert(activitiesData);
        if (error) throw error;
        
        const { data: activities, error: selectError } = await supabase
            .from('activities')
            .select('*');
        
        if (selectError) throw selectError;
        if (!activities || activities.length === 0) {
            throw new Error('No activities found after seeding');
        }
        
        console.log('Activities seeded successfully:', activities.length, 'records');
        return activities;
    } catch (error) {
        console.error('Detailed activities seeding error:', error);
        throw error;
    }
}

// Complete journal entries with updated structure
const manualJournalEntries = [
    {
        title: "A Day of Reflection",
        content: "Today was a challenging day, but I'm learning to find peace in the midst of uncertainty. I woke up feeling anxious about an upcoming project at work, but I took some time to meditate and ground myself. The morning started with a sense of overwhelming pressure, but as the day progressed, I realized that I have the strength and skills to handle whatever comes my way. I'm proud of how I managed my emotions and stayed focused.",
        mood_tags: ['anxious', 'hopeful', 'reflective'],
        tags: ['personal', 'work']
    },
    {
        title: "Unexpected Joy",
        content: "Sometimes the most beautiful moments come when you least expect them. Today, I reconnected with an old friend I hadn't spoken to in years. Our conversation brought back so many memories and reminded me of the importance of maintaining meaningful relationships. We laughed about our past adventures and shared our current life experiences. It felt like no time had passed at all. This unexpected connection lifted my spirits and made me appreciate the spontaneity of life.",
        mood_tags: ['excited', 'happy', 'grateful'],
        tags: ['relationships', 'personal']
    },
    {
        title: "Finding Balance",
        content: "Been working on finding balance between work and personal life. Started implementing small changes like dedicated break times and setting boundaries with work communications after hours. It's challenging but already seeing positive changes in my stress levels and overall well-being.",
        mood_tags: ['determined', 'hopeful', 'peaceful'],
        tags: ['work', 'health', 'personal']
    },
    {
        title: "Creative Exploration",
        content: "Spent the afternoon exploring watercolor painting. Never considered myself artistic, but there's something therapeutic about watching colors blend and flow. Made plenty of mistakes but each one taught me something new about the medium and myself.",
        mood_tags: ['creative', 'curious', 'peaceful'],
        tags: ['creativity', 'personal']
    },
    {
        title: "Community Connection",
        content: "Volunteered at the local food bank today. The sense of community and shared purpose was powerful. Met amazing people, each with their own story. Reminded me how small acts of kindness can create ripples of positive change.",
        mood_tags: ['grateful', 'inspired', 'connected'],
        tags: ['community', 'personal']
    }
];

// Seed Journals with AI Enhancements
async function seedJournals() {
    try {
        const journalEntries = [];
        const currentDate = new Date();

        for (const entry of manualJournalEntries) {
            // Generate AI enhancements
            const embedding = await generateEmbedding(entry.content);
            const summary = await generateSummary(entry.content);
            const keywords = await extractKeywords(entry.content);
            
            // Mock related articles
            const latestArticles = {
                articles: [
                    { 
                        title: faker.lorem.sentence(), 
                        url: faker.internet.url(),
                        relevance_score: faker.number.float({ min: 0.7, max: 1.0 })
                    },
                    { 
                        title: faker.lorem.sentence(), 
                        url: faker.internet.url(),
                        relevance_score: faker.number.float({ min: 0.7, max: 1.0 })
                    }
                ]
            };
            
            // Mock nearby places
            const nearbyPlaces = {
                places: [
                    { 
                        name: faker.company.name(), 
                        distance: faker.number.float({ min: 0.1, max: 5.0 }),
                        category: faker.helpers.arrayElement(['park', 'cafe', 'gym', 'library']),
                        rating: faker.number.float({ min: 3.5, max: 5.0 })
                    },
                    { 
                        name: faker.company.name(), 
                        distance: faker.number.float({ min: 0.1, max: 5.0 }),
                        category: faker.helpers.arrayElement(['park', 'cafe', 'gym', 'library']),
                        rating: faker.number.float({ min: 3.5, max: 5.0 })
                    }
                ]
            };

            // Extract key sentences for analysis
            const sentences = entry.content
                .split(/[.!?]+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);

            journalEntries.push({
                user_id: USER_ID,
                title: entry.title,
                content: entry.content,
                summary,
                mood_tags: entry.mood_tags,
                embedding,
                keywords,
                latest_articles: latestArticles,
                nearby_places: nearbyPlaces,
                sentences,
                tags: entry.tags,
                created_at: new Date(currentDate.getTime() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000))
            });
        }

        const { data, error } = await supabase.from('journals').upsert(journalEntries, {
            returning: true
        });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Detailed journals seeding error:', error);
        throw error;
    }
}

// Seed User Activities
async function seedUserActivities(activities) {
    try {
        const userActivities = [];
        const statuses = ['planned', 'in_progress', 'completed', 'skipped'];
        const reflectionTemplates = [
            "This activity helped me feel more {emotion}. I noticed {observation}.",
            "I found this {difficulty_level}. Next time, I'll {improvement}.",
            "The most valuable part was {insight}. I'll remember to {action}."
        ];

        for (let i = 0; i < 30; i++) {
            const activity = faker.helpers.arrayElement(activities);
            const status = faker.helpers.arrayElement(statuses);
            const isCompleted = status === 'completed';
            
            const reflection = faker.helpers.arrayElement(reflectionTemplates)
                .replace('{emotion}', faker.helpers.arrayElement(['energized', 'calm', 'focused', 'balanced']))
                .replace('{observation}', faker.lorem.sentence())
                .replace('{difficulty_level}', faker.helpers.arrayElement(['challenging', 'manageable', 'easy']))
                .replace('{improvement}', faker.lorem.sentence())
                .replace('{insight}', faker.lorem.sentence())
                .replace('{action}', faker.lorem.sentence());

            userActivities.push({
                user_id: USER_ID,
                activity_id: activity.id,
                status,
                notes: faker.lorem.sentence(),
                planned_at: faker.date.recent({ days: 90 }),
                completed_at: isCompleted ? faker.date.recent({ days: 90 }) : null,
                difficulty_rating: isCompleted ? faker.number.int({ min: 1, max: 5 }) : null,
                reflection: isCompleted ? reflection : null
            });
        }

        const { data, error } = await supabase.from('user_activities').upsert(userActivities, {
            returning: true
        });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Detailed user activities seeding error:', error);
        throw error;
    }
}

// Main Seeding Function
async function seedDatabase() {
    try {
        console.log('Starting database seeding...');
        
        // Test Supabase connection
        const { data: testData, error: testError } = await supabase.from('activities').select('count').limit(1);
        if (testError) {
            throw new Error(`Supabase connection test failed: ${testError.message}`);
        }
        console.log('Supabase connection successful');

        // Seed activities
        console.log('Seeding activities...');
        const activities = await seedActivities();
        console.log(`Successfully seeded ${activities} activities`);

        // Seed journals
        console.log('Seeding journals...');
        const journals = await seedJournals();
        console.log(`Successfully seeded ${journals} journals`);

        // Seed user activities
        console.log('Seeding user activities...');
        const userActivities = await seedUserActivities(activities);
        console.log(`Successfully seeded ${userActivities} user activities`);

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Seeding failed with error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            details: error.details || 'No additional details'
        });
        process.exit(1);
    }
}

// Run the seeding script
seedDatabase();