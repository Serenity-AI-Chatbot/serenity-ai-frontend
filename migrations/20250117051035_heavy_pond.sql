-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Journals Table (enhanced with AI insights and location data)
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    
    -- Enhanced Journal Content
    title TEXT,
    content TEXT NOT NULL,
    summary TEXT, -- AI-generated summary
    
    -- Mood Tracking Integration
    mood_tags TEXT[], -- AI-predicted mood labels, e.g., ['anxious', 'hopeful', 'tired']
    
    -- AI-powered insights
    embedding VECTOR(768),
    keywords TEXT[], -- Extracted keywords
    latest_articles JSONB, -- Stores related articles in JSON format
    nearby_places JSONB, -- Stores nearby places in JSON format
    sentences TEXT[], -- Extracted sentences for analysis
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[]
);

-- Activities Catalog
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, 
    
    recommended_moods TEXT[], -- Changed from mood_range to match with mood_tags
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration INT,
    
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Activity Tracking
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    activity_id UUID REFERENCES activities(id),
    
    status TEXT CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
    notes TEXT,
    
    planned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
    reflection TEXT
);

-- Modified Mood Trend Analysis Function
CREATE OR REPLACE FUNCTION get_mood_trends(
    p_user_id UUID
)
RETURNS TABLE (
    entry_date DATE,
    mood_categories JSONB,
    total_entries BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH daily_moods AS (
        SELECT 
            DATE(created_at) as entry_date,
            mood_tags,
            COUNT(*) as entries
        FROM journals
        WHERE user_id = p_user_id 
        GROUP BY DATE(created_at), mood_tags
        ORDER BY DATE(created_at)
    )
    SELECT 
        dm.entry_date,
        jsonb_object_agg(
            unnest(dm.mood_tags),
            COUNT(*)
        ) as mood_categories,
        SUM(dm.entries) as total_entries
    FROM daily_moods dm
    GROUP BY dm.entry_date
    ORDER BY dm.entry_date;
END;
$$;

-- Recommended Activities Based on Mood Tags
CREATE OR REPLACE FUNCTION get_recommended_activities(
    p_user_id UUID, 
    p_current_mood_tags TEXT[]
)
RETURNS TABLE (
    activity_id UUID,
    title TEXT,
    description TEXT,
    match_score double precision
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        (
            -- Calculate match score based on overlap between current mood tags and recommended moods
            ARRAY_LENGTH(
                ARRAY(
                    SELECT UNNEST(a.recommended_moods)
                    INTERSECT
                    SELECT UNNEST(p_current_mood_tags)
                ),
                1
            )::float / 
            GREATEST(
                ARRAY_LENGTH(a.recommended_moods, 1),
                ARRAY_LENGTH(p_current_mood_tags, 1)
            )::float
        ) AS match_score
    FROM activities a
    WHERE EXISTS (
        SELECT 1
        FROM UNNEST(a.recommended_moods) rm
        WHERE rm = ANY(p_current_mood_tags)
    )
    ORDER BY match_score DESC
    LIMIT 5;
END;
$$;

-- Semantic Search Function for Journals (unchanged)
CREATE OR REPLACE FUNCTION match_journals(
    query_embedding VECTOR(768), 
    match_threshold FLOAT, 
    match_count INT,
    user_id UUID
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        journals.id,
        journals.content,
        journals.summary,
        journals.created_at,
        1 - (journals.embedding <=> query_embedding) AS similarity
    FROM journals
    WHERE journals.user_id = user_id
    AND 1 - (journals.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Updated Dashboard Analytics Function
CREATE OR REPLACE FUNCTION get_dashboard_insights(
    p_user_id UUID, 
    p_days_back INT DEFAULT 90
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    WITH journal_analytics AS (
        SELECT 
            DATE_TRUNC('week', created_at) AS week,
            COUNT(*) AS journal_count,
            -- Aggregate mood tags
            jsonb_object_agg(
                unnest(mood_tags),
                COUNT(*)
            ) AS mood_distribution,
            -- Extract keywords frequency
            jsonb_object_agg(
                unnest(keywords),
                COUNT(*)
            ) AS keyword_distribution
        FROM journals
        WHERE user_id = p_user_id 
          AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY week
        ORDER BY week
    ),
    
    activity_analytics AS (
        SELECT 
            DATE_TRUNC('week', completed_at) AS week,
            COUNT(*) AS completed_activities,
            AVG(difficulty_rating) AS avg_activity_difficulty,
            
            -- Activity type breakdown
            SUM(CASE WHEN a.category = 'physical' THEN 1 ELSE 0 END) AS physical_activities,
            SUM(CASE WHEN a.category = 'mental' THEN 1 ELSE 0 END) AS mental_activities,
            SUM(CASE WHEN a.category = 'social' THEN 1 ELSE 0 END) AS social_activities
        FROM user_activities ua
        JOIN activities a ON ua.activity_id = a.id
        WHERE ua.user_id = p_user_id 
          AND ua.completed_at IS NOT NULL
          AND ua.completed_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY week
        ORDER BY week
    )
    
    -- Compile final JSON result
    SELECT jsonb_build_object(
        'journal_trends', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'week', week,
                    'journal_count', journal_count,
                    'mood_distribution', mood_distribution,
                    'keyword_distribution', keyword_distribution
                )
            )
            FROM journal_analytics
        ),
        
        'activity_trends', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'week', week,
                    'completed_activities', completed_activities,
                    'avg_activity_difficulty', avg_activity_difficulty,
                    'activity_types', jsonb_build_object(
                        'physical', physical_activities,
                        'mental', mental_activities,
                        'social', social_activities
                    )
                )
            )
            FROM activity_analytics
        ),
        
        'summary_insights', jsonb_build_object(
            'total_journals', (
                SELECT COUNT(*) 
                FROM journals 
                WHERE user_id = p_user_id 
                AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
            ),
            'total_activities', (
                SELECT COUNT(*) 
                FROM user_activities 
                WHERE user_id = p_user_id 
                AND completed_at IS NOT NULL 
                AND completed_at >= NOW() - (p_days_back || ' days')::INTERVAL
            ),
            'most_common_moods', (
                SELECT jsonb_object_agg(mood, count)
                FROM (
                    SELECT unnest(mood_tags) as mood, COUNT(*) as count
                    FROM journals
                    WHERE user_id = p_user_id 
                    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
                    GROUP BY unnest(mood_tags)
                    ORDER BY count DESC
                    LIMIT 5
                ) top_moods
            )
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Enable Row Level Security
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_journals_user_id ON journals(user_id);
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_journals_mood_tags ON journals USING gin(mood_tags);
CREATE INDEX idx_journals_keywords ON journals USING gin(keywords);
CREATE INDEX idx_journals_embedding ON journals USING ivfflat (embedding vector_cosine_ops);

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;