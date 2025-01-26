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

// Manually created journal entries
const manualJournalEntries = [
    {
        title: "A Day of Reflection",
        content: "Today was a challenging day, but I'm learning to find peace in the midst of uncertainty. I woke up feeling anxious about an upcoming project at work, but I took some time to meditate and ground myself. The morning started with a sense of overwhelming pressure, but as the day progressed, I realized that I have the strength and skills to handle whatever comes my way. I'm proud of how I managed my emotions and stayed focused.",
        mood_score: 7,
        mood_tags: ['anxious', 'hopeful', 'reflective'],
        tags: ['personal', 'work']
    },
    {
        title: "Unexpected Joy",
        content: "Sometimes the most beautiful moments come when you least expect them. Today, I reconnected with an old friend I hadn't spoken to in years. Our conversation brought back so many memories and reminded me of the importance of maintaining meaningful relationships. We laughed about our past adventures and shared our current life experiences. It felt like no time had passed at all. This unexpected connection lifted my spirits and made me appreciate the spontaneity of life.",
        mood_score: 9,
        mood_tags: ['excited', 'happy', 'grateful'],
        tags: ['relationships', 'personal']
    },
    {
        title: "Struggling with Self-Doubt",
        content: "I've been battling with imposter syndrome lately. Despite my achievements, I can't shake the feeling that I'm not good enough. At work, I find myself second-guessing every decision, worried that I'll make a mistake. It's exhausting to constantly fight these negative thoughts. I know intellectually that I'm capable, but emotionally, it's a different story. I'm trying to be kind to myself and remember that growth comes from challenging experiences, not from perfect performance.",
        mood_score: 4,
        mood_tags: ['sad', 'stressed', 'tired'],
        tags: ['work', 'health']
    },
    {
        title: "A Step Towards Wellness",
        content: "Today, I made a commitment to my physical and mental health. I started a new morning routine that includes stretching, a short meditation, and a nutritious breakfast. It wasn't easy to wake up earlier, but I felt more energized and focused throughout the day. I also signed up for a weekly yoga class, hoping to build consistency in my self-care practice. Small steps can lead to significant changes, and I'm proud of myself for taking this initiative.",
        mood_score: 8,
        mood_tags: ['hopeful', 'energetic', 'calm'],
        tags: ['health', 'personal']
    },
    {
        title: "Navigating Emotional Complexity",
        content: "Emotions are never simple, are they? Today, I experienced a mix of sadness and hope. I received some difficult news about a family member's health, which left me feeling vulnerable and worried. Yet, in the midst of this challenging situation, I found strength in the love and support of my family. We came together, shared our feelings, and reminded each other that we're not alone. It's during these moments that I truly understand the power of connection and empathy.",
        mood_score: 5,
        mood_tags: ['sad', 'hopeful', 'reflective'],
        tags: ['relationships', 'health']
    },
    {
        title: "Creative Breakthrough",
        content: "After weeks of feeling stuck, I finally had a breakthrough with my art project. The blank canvas that had been intimidating me for so long suddenly became a playground of possibilities. I started painting without overthinking, letting my emotions guide my brush. The result wasn't perfect, but it was authentic and raw. This experience reminded me that creativity isn't about perfection, but about expressing what's inside.",
        mood_score: 8,
        mood_tags: ['excited', 'inspired', 'hopeful'],
        tags: ['personal', 'creativity']
    },
    {
        title: "Confronting Financial Stress",
        content: "Money has been weighing heavily on my mind lately. The constant worry about bills, savings, and financial stability is draining. I spent hours today reviewing my budget, looking for ways to cut expenses and increase my income. It's overwhelming, but I'm trying to stay positive and proactive. I've scheduled a meeting with a financial advisor and started researching side gigs. Taking action, even small steps, helps me feel more in control.",
        mood_score: 3,
        mood_tags: ['stressed', 'anxious', 'determined'],
        tags: ['work', 'finances']
    },
    {
        title: "A Moment of Gratitude",
        content: "Today, I took a moment to truly appreciate the small things. The way sunlight filtered through my kitchen window, the warmth of my morning coffee, the kind smile from a stranger on the street. It's easy to get caught up in daily challenges and forget the beauty that surrounds us. I'm learning that happiness isn't about grand gestures, but about recognizing and cherishing these tiny, perfect moments.",
        mood_score: 9,
        mood_tags: ['grateful', 'peaceful', 'content'],
        tags: ['personal', 'mindfulness']
    },
    {
        title: "Recovering from Burnout",
        content: "I'm finally acknowledging that I've been burning the candle at both ends. The constant hustle, the need to prove myself, the endless stream of work and commitments - it's all caught up with me. Today, I made the difficult decision to take a step back. I'm setting boundaries, learning to say no, and prioritizing my mental health. It feels scary, but also liberating. Recovery isn't linear, and I'm okay with that.",
        mood_score: 6,
        mood_tags: ['tired', 'hopeful', 'determined'],
        tags: ['work', 'health']
    },
    {
        title: "Learning to Let Go",
        content: "Holding onto past hurts is like carrying a heavy backpack everywhere you go. Today, I decided to start unpacking some of that emotional baggage. A conversation with my therapist helped me realize that forgiveness isn't about the other person, but about freeing myself. It's a process, and I'm committed to healing, even when it's uncomfortable.",
        mood_score: 7,
        mood_tags: ['reflective', 'hopeful', 'calm'],
        tags: ['personal', 'health']
    },
    {
        title: "Celebrating Small Victories",
        content: "Not every day needs to be a massive achievement. Today, I celebrated the small wins: I did my laundry, went for a short walk, called my mom, and finished a book I've been reading for weeks. These might seem insignificant to some, but for me, they're signs of progress, especially on days when getting out of bed feels challenging.",
        mood_score: 8,
        mood_tags: ['proud', 'hopeful', 'calm'],
        tags: ['personal', 'health']
    },
    {
        title: "Confronting Loneliness",
        content: "Loneliness hit me hard today. The silence in my apartment felt deafening. I'm surrounded by technology that connects me to the world, yet I feel disconnected. I'm working on understanding this feeling, recognizing that loneliness is a human experience, not a personal failure. I'm considering joining some community groups and being more intentional about social connections.",
        mood_score: 3,
        mood_tags: ['sad', 'lonely', 'hopeful'],
        tags: ['relationships', 'personal']
    },
    {
        title: "Nature's Healing Power",
        content: "I spent the entire afternoon in the local park, away from screens and urban noise. The rustling leaves, the chirping birds, the gentle breeze - it was like nature was speaking directly to my soul. I realized how disconnected I've been from the natural world. This time outdoors wasn't just relaxing; it was a form of meditation, a reset button for my overwhelmed mind.",
        mood_score: 9,
        mood_tags: ['peaceful', 'calm', 'grateful'],
        tags: ['health', 'personal']
    },
    {
        title: "Navigating a Career Crossroads",
        content: "I'm at a critical point in my professional life. The career path I've been following no longer feels fulfilling. I'm scared of change, but even more scared of staying stagnant. Today, I started researching potential new directions, updating my resume, and reaching out to professionals in fields that intrigue me. It's terrifying and exciting all at once.",
        mood_score: 6,
        mood_tags: ['anxious', 'hopeful', 'determined'],
        tags: ['work', 'personal']
    },
    {
        title: "The Weight of Expectations",
        content: "Family gatherings always bring a mix of love and pressure. Today's dinner was a reminder of the expectations placed on me - career success, relationship status, life milestones. I'm learning to differentiate between others' expectations and my own desires. It's a delicate balance of respecting family while staying true to myself.",
        mood_score: 5,
        mood_tags: ['stressed', 'reflective', 'conflicted'],
        tags: ['relationships', 'personal']
    },
    {
        title: "Breaking Unhealthy Patterns",
        content: "I'm recognizing toxic patterns in my relationships and personal habits. It's painful to admit, but awareness is the first step to change. I've started therapy, begun setting clearer boundaries, and am learning to prioritize my own well-being. Change is uncomfortable, but necessary for growth.",
        mood_score: 7,
        mood_tags: ['determined', 'hopeful', 'reflective'],
        tags: ['health', 'personal']
    },
    {
        title: "Embracing Imperfection",
        content: "Perfection is an illusion that has controlled me for too long. Today, I deliberately did things 'imperfectly' - I cooked a meal without following the recipe exactly, I wore mismatched socks, I left a small mess in my living room. And you know what? The world didn't end. In fact, I felt a sense of liberation.",
        mood_score: 8,
        mood_tags: ['liberated', 'playful', 'calm'],
        tags: ['personal', 'health']
    },
    {
        title: "The Power of Connection",
        content: "In a world that often feels disconnected, today reminded me of the power of genuine human connection. A deep conversation with a friend, a compassionate interaction with a stranger, a shared laugh - these moments are what make life rich and meaningful. I'm learning to invest more in quality connections rather than quantity.",
        mood_score: 9,
        mood_tags: ['grateful', 'happy', 'content'],
        tags: ['relationships', 'personal']
    },
    {
        title: "Processing Grief",
        content: "Grief isn't linear. Some days, the pain feels manageable, and other days, it overwhelms me completely. Today was one of those overwhelming days. I miss my loved one so deeply. Memories flooded my mind - both beautiful and heart-wrenching. I'm learning that healing isn't about 'getting over' loss, but about learning to live with it.",
        mood_score: 2,
        mood_tags: ['sad', 'mourning', 'reflective'],
        tags: ['health', 'relationships']
    },
    {
        title: "Digital Detox Reflections",
        content: "I challenged myself to a 24-hour digital detox. No social media, no constant notifications, no mindless scrolling. The first few hours were challenging - I felt disconnected and anxious. But as the day progressed, I found a sense of peace. I read a book, went for a long walk, had real conversations. I realized how much noise technology introduces into my life.",
        mood_score: 8,
        mood_tags: ['calm', 'peaceful', 'reflective'],
        tags: ['personal', 'health']
    },
    {
        title: "Rediscovering Passion",
        content: "I dusted off my old guitar today, something I hadn't touched in years. My fingers were clumsy, the chords felt unfamiliar. But as I played, memories and emotions came flooding back. It wasn't about being perfect, but about reconnecting with a part of myself I had forgotten. Sometimes, rekindling an old passion can be the most healing experience.",
        mood_score: 9,
        mood_tags: ['excited', 'nostalgic', 'hopeful'],
        tags: ['creativity', 'personal']
    }
];

// Seed Journals with Embeddings
async function seedJournals() {
    try {
        const journalEntries = [];
        const currentDate = new Date();

        for (const entry of manualJournalEntries) {
            const embedding = await generateEmbedding(entry.content);
            
            // Calculate sentiment score based on mood score
            const sentimentScore = (entry.mood_score - 5.5) / 4.5;
            const sentimentLabel = sentimentScore < -0.5 ? 'very negative' :
                                   sentimentScore < 0 ? 'negative' :
                                   sentimentScore === 0 ? 'neutral' :
                                   sentimentScore <= 0.5 ? 'positive' : 'very positive';

            journalEntries.push({
                user_id: USER_ID,
                title: entry.title,
                content: entry.content,
                mood_score: entry.mood_score,
                mood_tags: entry.mood_tags,
                sentiment_score: sentimentScore,
                sentiment_label: sentimentLabel,
                embedding,
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
