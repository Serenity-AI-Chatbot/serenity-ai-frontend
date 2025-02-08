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
const USER_ID = '9d748057-818c-4368-afe2-965cb0621f67';
const EMBEDDING_MODEL = 'embedding-001';

// Utility function to generate embeddings
async function generateEmbedding(journalEntry) {
    // Create a rich context string that includes all relevant journal information
    const contextString = `
Title: ${journalEntry.title}
Date: ${journalEntry.created_at}
Content: ${journalEntry.content}
Mood Tags: ${journalEntry.mood_tags.join(', ')}
Tags: ${journalEntry.tags.join(', ')}
Keywords: ${journalEntry.keywords ? journalEntry.keywords.join(', ') : ''}
Summary: ${journalEntry.summary || ''}
Song: ${journalEntry.song || ''}
`.trim();

    console.log("================================================")
    console.log("contextString", contextString)
    console.log("================================================")
    
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(contextString);
    return result.embedding.values;
}

// Utility function to generate AI summary (simplified version without Gemini)
async function generateSummary(text) {
    // Simple summary generation by taking first 2-3 sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).join('. ') + '.';
}

// Utility function to extract keywords (simplified version without Gemini)
async function extractKeywords(text) {
    // Common keywords to extract from text
    const commonKeywords = [
        'work', 'health', 'family', 'friends', 'exercise', 'meditation',
        'stress', 'happiness', 'goals', 'achievement', 'challenge', 'growth',
        'relationship', 'career', 'learning', 'nature', 'creativity', 'self-care',
        'motivation', 'gratitude', 'mindfulness', 'productivity', 'balance'
    ];
    
    const textLower = text.toLowerCase();
    return commonKeywords.filter(keyword => textLower.includes(keyword)).slice(0, 7);
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
    },
    {
        title: "Achievement Unlocked",
        content: "Today was an incredible day at work! Finally completed the major project I've been working on for months. The team's reaction was priceless, and our client was beyond satisfied. This success has boosted my confidence tremendously. Celebrated with the team over virtual champagne - even through screens, the joy was contagious!",
        mood_tags: ['accomplished', 'proud', 'excited'],
        tags: ['work', 'achievement', 'personal']
    },
    {
        title: "Family Game Night",
        content: "Had the most amazing evening with family playing board games and sharing stories. Haven't laughed this hard in ages! It's these simple moments of connection that mean the most. Everyone was in such high spirits, and even my usually competitive sister was more focused on fun than winning.",
        mood_tags: ['joyful', 'loved', 'content'],
        tags: ['family', 'fun', 'connection']
    },
    {
        title: "Workout Milestone",
        content: "Hit a new personal record at the gym today! The consistent training is finally paying off. Started this journey feeling intimidated, but now I feel unstoppable. The endorphin rush is real, and my energy levels are through the roof. Proud of sticking to my fitness goals despite initial struggles.",
        mood_tags: ['energetic', 'strong', 'motivated'],
        tags: ['health', 'fitness', 'achievement']
    },
    {
        title: "Dealing with Setbacks",
        content: "Today was rough. Got passed over for the promotion I was hoping for. Feeling disappointed but trying to maintain perspective. Going to use this as motivation to work on developing new skills. Sometimes setbacks are setups for comebacks.",
        mood_tags: ['disappointed', 'determined', 'resilient'],
        tags: ['work', 'growth', 'challenge']
    },
    {
        title: "Morning Mindfulness",
        content: "Started the day with a peaceful meditation session by the window. The morning sun and gentle breeze created the perfect atmosphere. Feel centered and ready to take on whatever comes my way. These quiet moments of self-reflection are becoming my favorite part of the day.",
        mood_tags: ['peaceful', 'centered', 'mindful'],
        tags: ['mindfulness', 'self-care', 'morning-routine']
    },
    {
        title: "Social Anxiety Victory",
        content: "Pushed myself to attend a networking event despite my anxiety. Initially wanted to leave, but ended up making some great connections. Proud of myself for stepping out of my comfort zone. Each small victory over anxiety feels like a major breakthrough.",
        mood_tags: ['anxious', 'proud', 'brave'],
        tags: ['personal-growth', 'social', 'anxiety']
    },
    {
        title: "Creative Flow",
        content: "Lost track of time working on my art project today. The creative flow was incredible - colors, ideas, and inspiration just kept coming. Haven't felt this kind of pure creative joy in a while. Sometimes the best art comes when you let go of expectations.",
        mood_tags: ['inspired', 'focused', 'creative'],
        tags: ['art', 'creativity', 'flow']
    },
    {
        title: "Travel Adventures",
        content: "Just returned from an incredible solo trip to Japan! The blend of ancient traditions and modern technology was mind-blowing. From peaceful temples in Kyoto to the bustling streets of Tokyo, every moment was a new discovery. Tried foods I've never heard of and met wonderful people despite the language barrier.",
        mood_tags: ['adventurous', 'excited', 'inspired'],
        tags: ['travel', 'culture', 'personal-growth']
    },
    {
        title: "New Friendship Connection",
        content: "Met someone at a local book club who just gets me! We spent hours discussing our favorite authors and sharing life stories. It's rare to find someone who shares such similar interests and perspectives. Looking forward to building this friendship.",
        mood_tags: ['happy', 'connected', 'grateful'],
        tags: ['friendship', 'social', 'connection']
    },
    {
        title: "Career Breakthrough",
        content: "After months of studying and practice, I finally mastered that challenging programming concept! The moment it clicked was pure euphoria. My mentor's guidance really paid off, and I can already see how this will open new opportunities in my career.",
        mood_tags: ['accomplished', 'confident', 'motivated'],
        tags: ['career', 'learning', 'achievement']
    },
    {
        title: "Healing Process",
        content: "Today was a tough day dealing with the breakup. Spent time journaling and crying, but also practiced self-care with a long bath and favorite music. Emotions are raw but I know this is part of the healing journey. Called my best friend who helped put things in perspective.",
        mood_tags: ['sad', 'vulnerable', 'healing'],
        tags: ['relationships', 'emotional-processing', 'self-care']
    },
    {
        title: "Garden Success",
        content: "My first harvest from the garden today! The tomatoes and herbs I planted months ago finally produced fruit. There's something magical about eating food you've grown yourself. Even the mistakes and failed plants taught me valuable lessons about patience and persistence.",
        mood_tags: ['proud', 'satisfied', 'peaceful'],
        tags: ['hobby', 'nature', 'achievement']
    },
    {
        title: "Family Reconciliation",
        content: "Had a heart-to-heart with my sister after years of distance. We both acknowledged past hurts and shared our perspectives. It wasn't easy, but the weight lifted from finally addressing these issues feels incredible. Taking small steps toward rebuilding our relationship.",
        mood_tags: ['emotional', 'hopeful', 'relieved'],
        tags: ['family', 'relationships', 'healing']
    },
    {
        title: "Volunteer Impact",
        content: "Spent the day at the animal shelter and witnessed two long-term residents finally find their forever homes. The joy on both the animals' and adopters' faces was priceless. Reminded me how small actions can make a big difference in others' lives.",
        mood_tags: ['fulfilled', 'joyful', 'inspired'],
        tags: ['volunteering', 'community', 'purpose']
    },
    {
        title: "Health Journey",
        content: "Six months into my health journey and finally seeing real progress! Blood pressure is down, energy is up, and clothes fit better. More importantly, I feel stronger and more capable every day. Grateful for the support of my workout buddy who keeps me accountable.",
        mood_tags: ['proud', 'energetic', 'determined'],
        tags: ['health', 'fitness', 'personal-growth']
    },
    {
        title: "Creative Block Breakthrough",
        content: "After weeks of creative block, inspiration finally struck! Tried a new technique in my painting and the results exceeded my expectations. Sometimes stepping away and trying something completely different is exactly what's needed to spark creativity again.",
        mood_tags: ['creative', 'excited', 'relieved'],
        tags: ['art', 'creativity', 'breakthrough']
    },
    {
        title: "Financial Victory",
        content: "Finally paid off my student loans! Years of budgeting, side hustles, and saying no to unnecessary purchases have paid off. Celebrated by treating myself to a nice dinner - it tastes better when you know you can truly afford it. Ready to start saving for future goals.",
        mood_tags: ['accomplished', 'proud', 'free'],
        tags: ['finance', 'achievement', 'goals']
    }
];

// Seed Journals with AI Enhancements
async function seedJournals() {
    try {
        const journalEntries = [];
        const currentDate = new Date();

        for (const entry of manualJournalEntries) {
            // Generate summary and keywords first
            const summary = await generateSummary(entry.content);
            const keywords = await extractKeywords(entry.content);

            // Get appropriate song based on mood
            const song = getSongForMood(entry.mood_tags);
            
            // Create the complete journal entry object
            const journalEntry = {
                user_id: USER_ID,
                title: entry.title,
                content: entry.content,
                summary,
                mood_tags: entry.mood_tags,
                keywords,
                tags: entry.tags,
                song,
                created_at: new Date(currentDate.getTime() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000))
            };

            // Generate embedding with all context
            const embedding = await generateEmbedding(journalEntry);
            
            // Add embedding and other fields to the journal entry
            journalEntries.push({
                ...journalEntry,
                embedding,
                latest_articles: {
                    articles: Array(5).fill(null).map(() => ({
                        title: faker.company.name(),
                        link: faker.internet.url(),
                        snippet: faker.lorem.paragraph()
                    }))
                },
                nearby_places: {
                    places: Array(10).fill(null).map(() => ({
                        name: faker.company.name() + " Park",
                        address: faker.location.streetAddress() + ", " + faker.location.city(),
                        rating: faker.number.float({ min: 3.5, max: 5.0, precision: 0.1 }),
                        types: ["park", "point_of_interest", "establishment"],
                        user_ratings_total: faker.number.int({ min: 10, max: 8000 }),
                        image_url: faker.image.url('park')
                    }))
                },
                sentences: entry.content
                    .split(/[.!?]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0)
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

// Add this constant at the top of your file after other constants
const MENTAL_PEACE_SONGS = [
    'https://www.youtube.com/watch?v=F-6qLrgbjKo', // Default meditation song
    'https://www.youtube.com/watch?v=lFcSrYw-ARY', // Peaceful meditation music
    'https://www.youtube.com/watch?v=77ZozI0rw7w', // Relaxing piano music
    'https://www.youtube.com/watch?v=1ZYbU82GVz4', // Calming nature sounds
    'https://www.youtube.com/watch?v=WZKW2Hq2fks', // Zen meditation music
    'https://www.youtube.com/watch?v=2OEL4P1Rz04', // Deep sleep music
    'https://www.youtube.com/watch?v=lCOF9LN_Zxs', // Relaxing guitar music
    'https://www.youtube.com/watch?v=hlWiI4xVXKY', // Stress relief music
    'https://www.youtube.com/watch?v=9EKi2E9dVY8', // Ambient meditation
    'https://www.youtube.com/watch?v=XqeJ1kTlvWY'  // Peaceful flute music
];

// Function to get a song based on mood
function getSongForMood(moodTags) {
    // If the mood is peaceful, mindful, or related to meditation, higher chance of getting meditation-specific music
    const meditativeMoods = ['peaceful', 'mindful', 'centered', 'calm', 'reflective'];
    const hasMeditativeMood = moodTags.some(mood => meditativeMoods.includes(mood));
    
    if (hasMeditativeMood) {
        // Higher chance of getting first few songs which are more meditation-focused
        return MENTAL_PEACE_SONGS[Math.floor(Math.random() * 5)];
    }
    
    // Otherwise, return any random song from the list
    return MENTAL_PEACE_SONGS[Math.floor(Math.random() * MENTAL_PEACE_SONGS.length)];
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