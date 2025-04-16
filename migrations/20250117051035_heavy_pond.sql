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
    
    -- Music Integration
    song TEXT DEFAULT 'https://www.youtube.com/watch?v=F-6qLrgbjKo', -- Default YouTube song link
    
    -- AI-powered insights
    embedding VECTOR(768),
    keywords TEXT[], -- Extracted keywords
    latest_articles JSONB, -- Stores related articles in JSON format
    nearby_places JSONB, -- Stores nearby places in JSON format
    sentences TEXT[], -- Extracted sentences for analysis
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[],
    
    -- Processing status
    is_processing BOOLEAN DEFAULT FALSE,
    
    -- Location data
    location TEXT
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

-- Modified Mood Trend Analysis Function without nested aggregates
CREATE OR REPLACE FUNCTION get_mood_trends(
    p_user_id UUID
)
RETURNS TABLE (
    entry_date DATE,
    moods JSONB,
    entry_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH mood_counts AS (
        SELECT 
            DATE(created_at) as entry_date,
            unnest(mood_tags) as mood,
            COUNT(*) as mood_count
        FROM journals
        WHERE user_id = p_user_id
        GROUP BY DATE(created_at), unnest(mood_tags)
    )
    SELECT 
        mc.entry_date,
        jsonb_object_agg(mc.mood, mc.mood_count) as moods,
        COUNT(DISTINCT mc.mood) as entry_count
    FROM mood_counts mc
    GROUP BY mc.entry_date
    ORDER BY mc.entry_date DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_mood_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_mood_trends TO service_role;

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

-- Drop the old function
DROP FUNCTION IF EXISTS match_journals;

-- Create updated function with date parameter
CREATE OR REPLACE FUNCTION match_journals(
    query_embedding VECTOR(768),
    match_threshold FLOAT,
    match_count INTEGER,
    user_id UUID,
    target_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    summary TEXT,
    mood_tags TEXT[],
    tags TEXT[],
    keywords TEXT[],
    song TEXT,
    latest_articles JSONB,
    nearby_places JSONB,
    sentences TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.title,
        j.content,
        j.summary,
        j.mood_tags,
        j.tags,
        j.keywords,
        j.song,
        j.latest_articles,
        j.nearby_places,
        j.sentences,
        j.created_at,
        CASE 
            WHEN target_date IS NOT NULL THEN
                -- Prioritize exact date matches with a perfect similarity score
                CASE WHEN DATE(j.created_at) = target_date THEN 1.0
                ELSE 1 - (j.embedding <=> query_embedding)
                END
            ELSE 1 - (j.embedding <=> query_embedding)
        END AS similarity
    FROM journals j
    WHERE j.user_id = match_journals.user_id
    AND (
        target_date IS NULL 
        OR DATE(j.created_at) = target_date
        OR 1 - (j.embedding <=> query_embedding) > match_journals.match_threshold
    )
    ORDER BY similarity DESC, created_at DESC
    LIMIT match_journals.match_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION match_journals TO authenticated;
GRANT EXECUTE ON FUNCTION match_journals TO service_role;

-- Updated Dashboard Analytics Function
/*
  # Fix Dashboard Insights Function

  1. Changes
    - Fixed the ungrouped column error in the journal_analytics CTE
    - Improved the query structure to properly handle grouping
    - Maintained all existing functionality while fixing the grouping issue

  2. Details
    - Modified the journal_analytics CTE to properly group data
    - Ensured all columns used in subqueries are properly grouped
    - Maintained existing return structure and data format
*/

CREATE OR REPLACE FUNCTION get_dashboard_insights(
    p_user_id UUID, 
    p_days_back INT DEFAULT 90
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    WITH mood_counts AS (
        SELECT 
            DATE_TRUNC('week', created_at) AS week,
            unnest(mood_tags) as mood,
            COUNT(*) as count
        FROM journals
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('week', created_at), mood
    ),
    
    keyword_counts AS (
        SELECT 
            DATE_TRUNC('week', created_at) AS week,
            unnest(keywords) as keyword,
            COUNT(*) as count
        FROM journals
        WHERE user_id = p_user_id 
        AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('week', created_at), keyword
    ),
    
    journal_analytics AS (
        SELECT 
            weeks.week,
            COUNT(j.*) AS journal_count,
            (
                SELECT jsonb_object_agg(mood, count)
                FROM mood_counts mc
                WHERE mc.week = weeks.week
            ) AS mood_distribution,
            (
                SELECT jsonb_object_agg(keyword, count)
                FROM keyword_counts kc
                WHERE kc.week = weeks.week
            ) AS keyword_distribution
        FROM (
            SELECT DISTINCT DATE_TRUNC('week', dd)::date AS week
            FROM generate_series(
                NOW() - (p_days_back || ' days')::INTERVAL,
                NOW(),
                '1 week'::interval
            ) dd
        ) weeks
        LEFT JOIN journals j ON 
            DATE_TRUNC('week', j.created_at) = weeks.week
            AND j.user_id = p_user_id
        GROUP BY weeks.week
    ),
    
    activity_analytics AS (
        SELECT 
            DATE_TRUNC('week', ua.completed_at) AS week,
            COUNT(*) AS completed_activities,
            ROUND(AVG(ua.difficulty_rating)::numeric, 2) AS avg_activity_difficulty,
            jsonb_build_object(
                'physical', COUNT(*) FILTER (WHERE a.category = 'physical'),
                'mental', COUNT(*) FILTER (WHERE a.category = 'mental'),
                'social', COUNT(*) FILTER (WHERE a.category = 'social')
            ) as activity_types
        FROM user_activities ua
        JOIN activities a ON ua.activity_id = a.id
        WHERE ua.user_id = p_user_id 
        AND ua.completed_at IS NOT NULL
        AND ua.completed_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('week', ua.completed_at)
    ),
    
    mood_totals AS (
        SELECT mood, COUNT(*) as count
        FROM journals,
        LATERAL unnest(mood_tags) as mood
        WHERE user_id = p_user_id
        AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY mood
        ORDER BY count DESC
        LIMIT 5
    )

    SELECT jsonb_build_object(
        'journal_trends', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'week', week,
                        'journal_count', journal_count,
                        'mood_distribution', COALESCE(mood_distribution, '{}'::jsonb),
                        'keyword_distribution', COALESCE(keyword_distribution, '{}'::jsonb)
                    )
                    ORDER BY week
                )
                FROM journal_analytics
            ),
            '[]'::jsonb
        ),
        
        'activity_trends', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'week', week,
                        'completed_activities', completed_activities,
                        'avg_activity_difficulty', avg_activity_difficulty,
                        'activity_types', activity_types
                    )
                    ORDER BY week
                )
                FROM activity_analytics
            ),
            '[]'::jsonb
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
            'most_common_moods', COALESCE(
                (
                    SELECT jsonb_object_agg(mood, count)
                    FROM mood_totals
                ),
                '{}'::jsonb
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

-- Row Level Security Policies
-- Policy for user_activities table
CREATE POLICY "Users can view their own activities"
    ON user_activities
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
    ON user_activities
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
    ON user_activities
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
    ON user_activities
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy for journals table
CREATE POLICY "Users can view their own journals"
    ON journals
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journals"
    ON journals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create a function to get journals by month and year
CREATE OR REPLACE FUNCTION get_journals_by_date(
    p_user_id UUID,
    p_year INT DEFAULT NULL,
    p_month INT DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    summary TEXT,
    mood_tags TEXT[],
    tags TEXT[],
    keywords TEXT[],
    song TEXT,
    latest_articles JSONB,
    nearby_places JSONB,
    sentences TEXT[],
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.title,
        j.content,
        j.summary,
        j.mood_tags,
        j.tags,
        j.keywords,
        j.song,
        j.latest_articles,
        j.nearby_places,
        j.sentences,
        j.created_at
    FROM journals j
    WHERE j.user_id = get_journals_by_date.p_user_id
    AND (
        p_year IS NULL OR 
        EXTRACT(YEAR FROM j.created_at) = p_year
    )
    AND (
        p_month IS NULL OR 
        EXTRACT(MONTH FROM j.created_at) = p_month
    )
    ORDER BY j.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_journals_by_date TO authenticated;
GRANT EXECUTE ON FUNCTION get_journals_by_date TO service_role;

-- Update get_journal_stats_by_period function
CREATE OR REPLACE FUNCTION get_journal_stats_by_period(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    summary TEXT,
    mood_tags TEXT[],
    tags TEXT[],
    keywords TEXT[],
    song TEXT,
    latest_articles JSONB,
    nearby_places JSONB,
    sentences TEXT[],
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.title,
        j.content,
        j.summary,
        j.mood_tags,
        j.tags,
        j.keywords,
        j.song,
        j.latest_articles,
        j.nearby_places,
        j.sentences,
        j.created_at
    FROM journals j
    WHERE j.user_id = p_user_id
    AND j.created_at::DATE BETWEEN p_start_date AND p_end_date
    ORDER BY j.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_journal_stats_by_period TO authenticated;
GRANT EXECUTE ON FUNCTION get_journal_stats_by_period TO service_role;

-- Chat Tables for persistent chat history
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);

-- Row Level Security Policies for chats
CREATE POLICY "Users can view their own chats"
    ON chats
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
    ON chats
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
    ON chats
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
    ON chats
    FOR DELETE
    USING (auth.uid() = user_id);

-- Row Level Security Policies for chat messages
CREATE POLICY "Users can view their own chat messages"
    ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = chat_messages.chat_id
            AND chats.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own chat messages"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = chat_messages.chat_id
            AND chats.user_id = auth.uid()
        )
    );

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create functions to get user's chats
CREATE OR REPLACE FUNCTION get_user_chats(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_message TEXT,
    message_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        (
            SELECT cm.content
            FROM chat_messages cm
            WHERE cm.chat_id = c.id
            ORDER BY cm.created_at DESC
            LIMIT 1
        ) as last_message,
        (
            SELECT COUNT(*)
            FROM chat_messages cm
            WHERE cm.chat_id = c.id
        ) as message_count
    FROM chats c
    WHERE c.user_id = p_user_id
    ORDER BY c.updated_at DESC;
END;
$$;

-- Create function to get messages for a specific chat
CREATE OR REPLACE FUNCTION get_chat_messages(
    p_chat_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    role TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
    -- First check if the chat belongs to the user
    IF NOT EXISTS (
        SELECT 1 FROM chats c
        WHERE c.id = p_chat_id
        AND c.user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Chat not found or access denied';
    END IF;
    
    RETURN QUERY
    SELECT 
        cm.id,
        cm.role,
        cm.content,
        cm.created_at
    FROM chat_messages cm
    WHERE cm.chat_id = p_chat_id
    ORDER BY cm.created_at ASC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_chats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_chats TO service_role;
GRANT EXECUTE ON FUNCTION get_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_messages TO service_role;

-- Create function to delete a chat and all its messages
CREATE OR REPLACE FUNCTION delete_chat(
    p_chat_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    chat_exists BOOLEAN;
BEGIN
    -- First check if the chat belongs to the user
    SELECT EXISTS (
        SELECT 1 FROM chats c
        WHERE c.id = p_chat_id
        AND c.user_id = p_user_id
    ) INTO chat_exists;
    
    IF NOT chat_exists THEN
        RAISE EXCEPTION 'Chat not found or access denied';
    END IF;
    
    -- Delete the chat (cascade will delete messages automatically)
    DELETE FROM chats
    WHERE id = p_chat_id
    AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION delete_chat TO authenticated;
GRANT EXECUTE ON FUNCTION delete_chat TO service_role;

-- Create table for Telegram users
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users (id),
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for Telegram messages
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_chat_id TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  message_id BIGINT,
  content TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster retrieval of chat history
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON telegram_messages (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON telegram_messages (created_at);

-- Function to get most recent Telegram messages for a chat
CREATE OR REPLACE FUNCTION get_telegram_chat_history(
  p_chat_id TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF telegram_messages
LANGUAGE SQL
AS $$
  SELECT *
  FROM telegram_messages
  WHERE telegram_chat_id = p_chat_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Create RLS policies for secure access
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to view their own Telegram user info
CREATE POLICY telegram_users_select_own ON telegram_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow service role to manage all Telegram data  
CREATE POLICY telegram_users_service_all ON telegram_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY telegram_messages_service_all ON telegram_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow webhook function to access telegram data
GRANT SELECT, INSERT, UPDATE ON telegram_users TO anon, authenticated;
GRANT SELECT, INSERT ON telegram_messages TO anon, authenticated;

-- Drop the old mood_feedback table if it exists
DROP TABLE IF EXISTS mood_feedback;

-- Create table for mood feedback
CREATE TABLE IF NOT EXISTS mood_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  mood_tag TEXT NOT NULL,
  accuracy_rating INT CHECK (accuracy_rating BETWEEN 1 AND 5),
  feedback_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_mood_feedback_user_id ON mood_feedback(user_id);

-- Enable RLS
ALTER TABLE mood_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own mood feedback"
  ON mood_feedback
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own mood feedback"
  ON mood_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT ON mood_feedback TO authenticated;

-- Create table for user context
CREATE TABLE IF NOT EXISTS user_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  information JSONB NOT NULL,
  relevance_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_user_context_user_id ON user_context(user_id);
CREATE INDEX idx_user_context_entity_name ON user_context(entity_name);
CREATE INDEX idx_user_context_entity_type ON user_context(entity_type);

-- Enable RLS
ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own context"
  ON user_context
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own context"
  ON user_context
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own context"
  ON user_context
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own context"
  ON user_context
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_context TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_context TO service_role;

-- Create function to get user context
CREATE OR REPLACE FUNCTION get_user_context(
  p_user_id UUID,
  p_query TEXT DEFAULT NULL
)
RETURNS SETOF user_context
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_query IS NULL THEN
    RETURN QUERY
    SELECT * FROM user_context
    WHERE user_id = p_user_id
    ORDER BY updated_at DESC;
  ELSE
    RETURN QUERY
    SELECT * FROM user_context
    WHERE user_id = p_user_id
      AND (
        entity_name ILIKE '%' || p_query || '%' OR
        entity_type ILIKE '%' || p_query || '%' OR
        information::text ILIKE '%' || p_query || '%'
      )
    ORDER BY updated_at DESC;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_context TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_context TO service_role; 