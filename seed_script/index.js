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

    const { data, error } = await supabase.from('activities').upsert(activitiesData);
    if (error) {
        console.error('Error seeding activities:', error);
        throw error;
    }
    return data;
}

// Seed Journals with Embeddings
async function seedJournals() {
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

    const { data, error } = await supabase.from('journals').upsert(journalEntries);
    if (error) console.error('Error seeding journals:', error);
    return data;
}

// Seed User Activities
async function seedUserActivities(activities) {
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

    const { data, error } = await supabase.from('user_activities').upsert(userActivities);
    if (error) console.error('Error seeding user activities:', error);
    return data;
}

// Main Seeding Function
async function seedDatabase() {
    try {
        console.log('Starting database seeding...');
        
        // Seed activities first
        const activities = await seedActivities();
        if (!activities) {
            throw new Error('Failed to seed activities - no data returned');
        }
        console.log(`Seeded ${activities.length} activities`);
        
        // Seed journals with embeddings
        const journals = await seedJournals();
        if (!journals) {
            throw new Error('Failed to seed journals - no data returned');
        }
        console.log(`Seeded ${journals.length} journal entries`);
        
        // Seed user activities
        const userActivities = await seedUserActivities(activities);
        if (!userActivities) {
            throw new Error('Failed to seed user activities - no data returned');
        }
        console.log(`Seeded ${userActivities.length} user activities`);
        
        console.log('Seeding complete!');
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

// Run the seeding script
seedDatabase();
