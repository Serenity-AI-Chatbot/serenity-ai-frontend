-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Journals Table (now includes mood tracking)
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    
    -- Enhanced Journal Content
    title TEXT,
    content TEXT NOT NULL,
    
    -- Mood Tracking Integration
    mood_score INT CHECK (mood_score BETWEEN 1 AND 10),
    mood_tags TEXT[], -- e.g., ['anxious', 'hopeful', 'tired']
    
    -- AI-powered insights
    sentiment_score FLOAT, 
    sentiment_label TEXT,
    embedding VECTOR(768),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[]
);

-- Activities Catalog (remains the same as previous schema)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, 
    
    recommended_mood_range INT4RANGE,
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

-- Mood Trend Analysis Function
CREATE OR REPLACE FUNCTION get_mood_trends(
    p_user_id UUID, 
    p_days_back INT DEFAULT 30
)
RETURNS TABLE (
    average_mood FLOAT,
    mood_trend TEXT,
    total_entries BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(AVG(mood_score), 0)::FLOAT AS average_mood,
        CASE 
            WHEN AVG(mood_score) BETWEEN 1 AND 3 THEN 'Low'
            WHEN AVG(mood_score) BETWEEN 4 AND 6 THEN 'Moderate'
            WHEN AVG(mood_score) BETWEEN 7 AND 10 THEN 'High'
            ELSE 'No Data'
        END AS mood_trend,
        COUNT(*)::BIGINT AS total_entries
    FROM journals
    WHERE user_id = p_user_id 
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$;

-- Recommended Activities Based on Mood
CREATE OR REPLACE FUNCTION get_recommended_activities(
    p_user_id UUID, 
    p_current_mood double precision
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
        CASE 
            WHEN p_current_mood BETWEEN lower(a.recommended_mood_range) AND upper(a.recommended_mood_range) 
            THEN 1.0 
            ELSE 0.5 
        END::double precision AS match_score
    FROM activities a
    WHERE 
        p_current_mood BETWEEN lower(a.recommended_mood_range) AND upper(a.recommended_mood_range)
    ORDER BY match_score DESC
    LIMIT 5;
END;
$$;

-- Semantic Search Function for Journals
CREATE OR REPLACE FUNCTION match_journals(
    query_embedding VECTOR(768), 
    match_threshold FLOAT, 
    match_count INT,
    user_id UUID
)
RETURNS TABLE (
    id UUID,
    content TEXT,
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
        journals.created_at,
        1 - (journals.embedding <=> query_embedding) AS similarity
    FROM journals
    WHERE journals.user_id = user_id
    AND 1 - (journals.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Comprehensive Dashboard Analytics Function
CREATE OR REPLACE FUNCTION get_dashboard_insights(
    p_user_id UUID, 
    p_days_back INT DEFAULT 90
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    -- Comprehensive dashboard insights
    WITH journal_analytics AS (
        SELECT 
            DATE_TRUNC('week', created_at) AS week,
            AVG(mood_score) AS avg_weekly_mood,
            COUNT(*) AS journal_count,
            AVG(sentiment_score) AS avg_sentiment,
            
            -- Mood distribution
            SUM(CASE WHEN mood_score BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS low_mood_count,
            SUM(CASE WHEN mood_score BETWEEN 4 AND 6 THEN 1 ELSE 0 END) AS moderate_mood_count,
            SUM(CASE WHEN mood_score BETWEEN 7 AND 10 THEN 1 ELSE 0 END) AS high_mood_count,
            
            -- Sentiment distribution
            SUM(CASE WHEN sentiment_score < -0.5 THEN 1 ELSE 0 END) AS very_negative_count,
            SUM(CASE WHEN sentiment_score BETWEEN -0.5 AND -0.1 THEN 1 ELSE 0 END) AS negative_count,
            SUM(CASE WHEN sentiment_score BETWEEN -0.1 AND 0.1 THEN 1 ELSE 0 END) AS neutral_count,
            SUM(CASE WHEN sentiment_score BETWEEN 0.1 AND 0.5 THEN 1 ELSE 0 END) AS positive_count,
            SUM(CASE WHEN sentiment_score > 0.5 THEN 1 ELSE 0 END) AS very_positive_count
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
    ),
    
    mood_progression AS (
        SELECT 
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY mood_score) AS mood_25th,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mood_score) AS mood_median,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY mood_score) AS mood_75th,
            MIN(mood_score) AS mood_min,
            MAX(mood_score) AS mood_max
        FROM journals
        WHERE user_id = p_user_id 
          AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    )
    
    -- Compile final JSON result
    SELECT jsonb_build_object(
        'journal_trends', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'week', week,
                    'avg_mood', avg_weekly_mood,
                    'journal_count', journal_count,
                    'avg_sentiment', avg_sentiment,
                    'mood_distribution', jsonb_build_object(
                        'low', low_mood_count,
                        'moderate', moderate_mood_count,
                        'high', high_mood_count
                    ),
                    'sentiment_distribution', jsonb_build_object(
                        'very_negative', very_negative_count,
                        'negative', negative_count,
                        'neutral', neutral_count,
                        'positive', positive_count,
                        'very_positive', very_positive_count
                    )
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
        
        'mood_progression', (
            SELECT jsonb_build_object(
                '25th_percentile', mood_25th,
                'median', mood_median,
                '75th_percentile', mood_75th,
                'min_mood', mood_min,
                'max_mood', mood_max
            )
            FROM mood_progression
        ),
        
        'summary_insights', jsonb_build_object(
            'total_journals', (SELECT COUNT(*) FROM journals WHERE user_id = p_user_id AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL),
            'total_activities', (SELECT COUNT(*) FROM user_activities WHERE user_id = p_user_id AND completed_at IS NOT NULL AND completed_at >= NOW() - (p_days_back || ' days')::INTERVAL),
            'average_daily_mood', (SELECT AVG(mood_score) FROM journals WHERE user_id = p_user_id AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL)
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

-- Optional: Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;