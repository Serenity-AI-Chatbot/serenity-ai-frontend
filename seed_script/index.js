import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

// Load environment variables
dotenv.config();
// console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)

// Initialize Supabase and Gemini clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Constants
const USER_ID = '27664696-f7e7-4a09-927b-1967b6a0c8a4';
const EMBEDDING_MODEL = 'embedding-001';

// Utility function to generate embeddings
async function generateEmbedding(text) {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

// Seed Activities
async function seedActivities() {
    try {
        const activitiesData = [
            {
                title: 'Meditation',
                description: 'A mindful practice to reduce stress and increase awareness',
                category: 'mental',
                recommended_mood_range: '[3,7]',
                difficulty_level: 'beginner',
                estimated_duration: 15,
                tags: ['mindfulness', 'relaxation']
            },
            {
                title: 'Running',
                description: 'Outdoor cardiovascular exercise to boost mood and energy',
                category: 'physical',
                recommended_mood_range: '[6,10]',
                difficulty_level: 'intermediate',
                estimated_duration: 45,
                tags: ['fitness', 'outdoor']
            },
            {
                title: 'Journaling',
                description: 'Expressive writing to process emotions and reflect',
                category: 'mental',
                recommended_mood_range: '[1,8]',
                difficulty_level: 'beginner',
                estimated_duration: 20,
                tags: ['self-reflection', 'emotional-processing']
            },
            {
                title: 'Group Yoga Class',
                description: 'Social and physical activity promoting wellness',
                category: 'social',
                recommended_mood_range: '[5,9]',
                difficulty_level: 'intermediate',
                estimated_duration: 60,
                tags: ['fitness', 'social', 'wellness']
            }
        ];

        // First do the upsert
        const { error } = await supabase.from('activities').upsert(activitiesData);
        if (error) throw error;
        
        // Then fetch the activities
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

// Seed Journals with Embeddings
async function seedJournals() {
    try {
        const journalEntries = [];
        const moodTags = [
            'anxious', 'hopeful', 'tired', 'energetic', 
            'sad', 'excited', 'calm', 'stressed'
        ];

        for (let i = 0; i < 20; i++) {
            const content = faker.lorem.paragraphs(3);
            const moodScore = faker.number.int({ min: 1, max: 10 });
            
            const embedding = await generateEmbedding(content);
            
            const sentimentScore = faker.number.float({ min: -1, max: 1 });
            const sentimentLabel = sentimentScore < -0.5 ? 'very negative' :
                                   sentimentScore < 0 ? 'negative' :
                                   sentimentScore === 0 ? 'neutral' :
                                   sentimentScore <= 0.5 ? 'positive' : 'very positive';

            journalEntries.push({
                user_id: USER_ID,
                title: faker.lorem.sentence(),
                content,
                mood_score: moodScore,
                mood_tags: faker.helpers.arrayElements(moodTags, { min: 1, max: 3 }),
                sentiment_score: sentimentScore,
                sentiment_label: sentimentLabel,
                embedding,
                tags: faker.helpers.arrayElements(['personal', 'work', 'health', 'relationships'], { min: 1, max: 2 }),
                created_at: faker.date.recent({ days: 90 })
            });
        }

        const { data, error } = await supabase.from('journals').upsert(journalEntries, {
            returning: true  // Explicitly request returning data
        });
        
        if (error) throw error;
        // if (!data || data.length === 0) {
        //     throw new Error('No data returned from journals upsert');
        // }
        
        return data;
    } catch (error) {
        console.error('Detailed journals seeding error:', error);
        throw error;
    }
}

// Seed User Activities
async function seedUserActivities(activities) {
    try {
        // if (!activities || !Array.isArray(activities) || activities.length === 0) {
        //     throw new Error('Invalid activities data provided to seedUserActivities');
        // }

        const userActivities = [];
        const statuses = ['planned', 'in_progress', 'completed', 'skipped'];

        for (let i = 0; i < 30; i++) {
            const activity = faker.helpers.arrayElement(activities);
            
            userActivities.push({
                user_id: USER_ID,
                activity_id: activity.id,
                status: faker.helpers.arrayElement(statuses),
                notes: faker.lorem.sentence(),
                planned_at: faker.date.recent({ days: 90 }),
                completed_at: faker.datatype.boolean() ? faker.date.recent({ days: 90 }) : null,
                difficulty_rating: faker.number.int({ min: 1, max: 5 }),
                reflection: faker.lorem.paragraph()
            });
        }

        const { data, error } = await supabase.from('user_activities').upsert(userActivities, {
            returning: true  // Explicitly request returning data
        });
        
        if (error) throw error;
        // if (!data || data.length === 0) {
        //     throw new Error('No data returned from user_activities upsert');
        // }
        
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
        console.log('Checking Supabase connection...');
        
        // Test Supabase connection
        const { data: testData, error: testError } = await supabase.from('activities').select('count').limit(1);
        if (testError) {
            throw new Error(`Supabase connection test failed: ${testError.message}`);
        }
        console.log('Supabase connection successful');

        // Seed activities
        console.log('Seeding activities...');
        const activities = await seedActivities();
        console.log(`Successfully seeded activities`);
        console.log(`${activities}`);

        // Seed journals
        console.log('Seeding journals...');
        const journals = await seedJournals();
        console.log(`Successfully seeded journals`);
        console.log(`${journals}`);

        // Seed user activities
        console.log('Seeding user activities...');
        const userActivities = await seedUserActivities(activities);
        console.log(`Successfully seeded user activities`);
        console.log(`${userActivities}`);

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
