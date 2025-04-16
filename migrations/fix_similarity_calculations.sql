-- Fix for the similarity calculation functions to handle edge cases better

-- Function to calculate mood similarity between two users with improved handling
CREATE OR REPLACE FUNCTION calculate_mood_similarity(
  user1_id UUID,
  user2_id UUID,
  days_back INT DEFAULT 90
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  similarity FLOAT;
  user1_has_data BOOLEAN;
  user2_has_data BOOLEAN;
  default_score FLOAT := 0.3; -- Default base similarity
BEGIN
  -- Check if users have any mood data
  SELECT EXISTS (
    SELECT 1
    FROM journals
    WHERE user_id = user1_id
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND array_length(mood_tags, 1) > 0
  ) INTO user1_has_data;
  
  SELECT EXISTS (
    SELECT 1
    FROM journals
    WHERE user_id = user2_id
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND array_length(mood_tags, 1) > 0
  ) INTO user2_has_data;

  -- If either user has no data, return a default base similarity
  IF NOT user1_has_data OR NOT user2_has_data THEN
    RETURN default_score;
  END IF;

  -- Calculate similarity based on mood_tags overlap in recent journals
  WITH user1_moods AS (
    SELECT unnest(mood_tags) as mood, COUNT(*) as count
    FROM journals
    WHERE user_id = user1_id
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY mood
  ),
  user2_moods AS (
    SELECT unnest(mood_tags) as mood, COUNT(*) as count
    FROM journals
    WHERE user_id = user2_id
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY mood
  ),
  common_moods AS (
    SELECT 
      u1.mood, 
      u1.count as u1_count, 
      u2.count as u2_count,
      LEAST(u1.count, u2.count)::float / GREATEST(u1.count, u2.count)::float as mood_similarity
    FROM user1_moods u1
    JOIN user2_moods u2 ON u1.mood = u2.mood
  )
  SELECT COALESCE(
    CASE 
      WHEN (SELECT COUNT(*) FROM user1_moods) = 0 OR (SELECT COUNT(*) FROM user2_moods) = 0 THEN default_score
      WHEN (SELECT COUNT(*) FROM common_moods) = 0 THEN 0.1 -- Some small similarity if they have data but no overlap
      ELSE GREATEST((SELECT AVG(mood_similarity) FROM common_moods), 0.1) -- Ensure at least some similarity
    END, default_score) INTO similarity;
  
  RETURN similarity;
END;
$$;

-- Function to calculate activity similarity between two users with improved handling
CREATE OR REPLACE FUNCTION calculate_activity_similarity(
  user1_id UUID,
  user2_id UUID,
  days_back INT DEFAULT 90
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  similarity FLOAT;
  user1_has_data BOOLEAN;
  user2_has_data BOOLEAN;
  default_score FLOAT := 0.2; -- Default base similarity
BEGIN
  -- Check if users have any activity data
  SELECT EXISTS (
    SELECT 1
    FROM user_activities ua
    WHERE ua.user_id = user1_id
    AND ua.completed_at IS NOT NULL
    AND ua.completed_at >= NOW() - (days_back || ' days')::INTERVAL
  ) INTO user1_has_data;
  
  SELECT EXISTS (
    SELECT 1
    FROM user_activities ua
    WHERE ua.user_id = user2_id
    AND ua.completed_at IS NOT NULL
    AND ua.completed_at >= NOW() - (days_back || ' days')::INTERVAL
  ) INTO user2_has_data;

  -- If either user has no data, return a default base similarity
  IF NOT user1_has_data OR NOT user2_has_data THEN
    RETURN default_score;
  END IF;

  -- Calculate similarity based on completed activities
  WITH user1_activities AS (
    SELECT a.category, COUNT(*) as count
    FROM user_activities ua
    JOIN activities a ON ua.activity_id = a.id
    WHERE ua.user_id = user1_id
    AND ua.completed_at IS NOT NULL
    AND ua.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY a.category
  ),
  user2_activities AS (
    SELECT a.category, COUNT(*) as count
    FROM user_activities ua
    JOIN activities a ON ua.activity_id = a.id
    WHERE ua.user_id = user2_id
    AND ua.completed_at IS NOT NULL
    AND ua.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY a.category
  ),
  common_categories AS (
    SELECT 
      u1.category, 
      u1.count as u1_count, 
      u2.count as u2_count,
      LEAST(u1.count, u2.count)::float / GREATEST(u1.count, u2.count)::float as category_similarity
    FROM user1_activities u1
    JOIN user2_activities u2 ON u1.category = u2.category
  )
  SELECT COALESCE(
    CASE 
      WHEN (SELECT COUNT(*) FROM user1_activities) = 0 OR (SELECT COUNT(*) FROM user2_activities) = 0 THEN default_score
      WHEN (SELECT COUNT(*) FROM common_categories) = 0 THEN 0.1 -- Some small similarity if they have data but no overlap
      ELSE GREATEST((SELECT AVG(category_similarity) FROM common_categories), 0.1) -- Ensure at least some similarity
    END, default_score) INTO similarity;
  
  RETURN similarity;
END;
$$;

-- Function to calculate context similarity between two users with improved handling
CREATE OR REPLACE FUNCTION calculate_context_similarity(
  user1_id UUID,
  user2_id UUID
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  similarity FLOAT;
  user1_has_data BOOLEAN;
  user2_has_data BOOLEAN;
  default_score FLOAT := 0.25; -- Default base similarity
BEGIN
  -- Check if users have any context data
  SELECT EXISTS (
    SELECT 1
    FROM user_context
    WHERE user_id = user1_id
  ) INTO user1_has_data;
  
  SELECT EXISTS (
    SELECT 1
    FROM user_context
    WHERE user_id = user2_id
  ) INTO user2_has_data;

  -- If either user has no data, return a default base similarity
  IF NOT user1_has_data OR NOT user2_has_data THEN
    RETURN default_score;
  END IF;

  -- Calculate similarity based on user_context data
  WITH user1_contexts AS (
    SELECT entity_type, COUNT(*) as count
    FROM user_context
    WHERE user_id = user1_id
    GROUP BY entity_type
  ),
  user2_contexts AS (
    SELECT entity_type, COUNT(*) as count
    FROM user_context
    WHERE user_id = user2_id
    GROUP BY entity_type
  ),
  common_contexts AS (
    SELECT 
      u1.entity_type, 
      u1.count as u1_count, 
      u2.count as u2_count,
      LEAST(u1.count, u2.count)::float / GREATEST(u1.count, u2.count)::float as context_similarity
    FROM user1_contexts u1
    JOIN user2_contexts u2 ON u1.entity_type = u2.entity_type
  )
  SELECT COALESCE(
    CASE 
      WHEN (SELECT COUNT(*) FROM user1_contexts) = 0 OR (SELECT COUNT(*) FROM user2_contexts) = 0 THEN default_score
      WHEN (SELECT COUNT(*) FROM common_contexts) = 0 THEN 0.1 -- Some small similarity if they have data but no overlap
      ELSE GREATEST((SELECT AVG(context_similarity) FROM common_contexts), 0.1) -- Ensure at least some similarity
    END, default_score) INTO similarity;
  
  RETURN similarity;
END;
$$;

-- Update the generate_user_recommendations function to ensure meaningful scores
CREATE OR REPLACE FUNCTION generate_user_recommendations(
  p_user_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  recommended_user_id UUID,
  display_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  match_score FLOAT,
  mood_similarity FLOAT,
  activity_similarity FLOAT,
  context_similarity FLOAT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing recommendations that haven't been acted upon
  DELETE FROM user_recommendations
  WHERE user_id = p_user_id
  AND is_approved = FALSE 
  AND is_rejected = FALSE;
  
  -- Insert new recommendations
  WITH potential_recommendations AS (
    SELECT 
      up.user_id AS rec_user_id,
      up.display_name AS rec_display_name,
      up.bio AS rec_bio,
      up.profile_picture_url AS rec_profile_picture_url,
      -- Calculate individual similarities
      calculate_mood_similarity(p_user_id, up.user_id) as mood_sim,
      calculate_activity_similarity(p_user_id, up.user_id) as activity_sim,
      calculate_context_similarity(p_user_id, up.user_id) as context_sim,
      -- Get user preferences or use defaults
      COALESCE((p.connection_preferences->>'mood_match_weight')::float, 0.5) as mood_weight,
      COALESCE((p.connection_preferences->>'activity_match_weight')::float, 0.3) as activity_weight,
      COALESCE((p.connection_preferences->>'context_match_weight')::float, 0.2) as context_weight
    FROM user_profiles up
    JOIN user_profiles p ON p.user_id = p_user_id
    WHERE 
      up.is_discoverable = TRUE
      AND up.user_id != p_user_id
      -- Only include users that share at least some data
      AND (
        (up.shared_mood_data = TRUE) OR 
        (up.shared_activity_data = TRUE) OR 
        (up.shared_context_data = TRUE)
      )
      -- Don't include users that are already connected or have pending connections
      AND NOT EXISTS (
        SELECT 1 FROM user_connections uc
        WHERE (uc.user1_id = p_user_id AND uc.user2_id = up.user_id)
        OR (uc.user1_id = up.user_id AND uc.user2_id = p_user_id)
      )
      -- Don't include users that have already been processed (either rejected or approved)
      AND NOT EXISTS (
        SELECT 1 FROM user_recommendations ur
        WHERE ur.user_id = p_user_id 
        AND ur.recommended_user_id = up.user_id
        AND (ur.is_rejected = TRUE OR ur.is_approved = TRUE)
      )
  ),
  scored_recommendations AS (
    SELECT
      rec_user_id,
      rec_display_name,
      rec_bio,
      rec_profile_picture_url,
      mood_sim,
      activity_sim,
      context_sim,
      -- Calculate weighted overall score with minimum threshold
      GREATEST(
        (mood_sim * mood_weight) + 
        (activity_sim * activity_weight) + 
        (context_sim * context_weight),
        0.15  -- Ensure a minimum match score
      ) as overall_score
    FROM potential_recommendations
    ORDER BY overall_score DESC
    LIMIT p_limit
  )
  INSERT INTO user_recommendations (
    user_id, 
    recommended_user_id, 
    match_score, 
    mood_similarity, 
    activity_similarity, 
    context_similarity
  )
  SELECT 
    p_user_id,
    sr.rec_user_id,
    sr.overall_score,
    sr.mood_sim,
    sr.activity_sim,
    sr.context_sim
  FROM scored_recommendations sr
  WHERE NOT EXISTS (
    -- Final check to avoid violating the unique constraint
    SELECT 1 FROM user_recommendations ur
    WHERE ur.user_id = p_user_id
    AND ur.recommended_user_id = sr.rec_user_id
  );
  
  -- Return the recommendations with user profile information
  RETURN QUERY
  SELECT 
    ur.recommended_user_id,
    up.display_name,
    up.bio,
    up.profile_picture_url,
    ur.match_score,
    ur.mood_similarity,
    ur.activity_similarity,
    ur.context_similarity
  FROM user_recommendations ur
  JOIN user_profiles up ON ur.recommended_user_id = up.user_id
  WHERE ur.user_id = p_user_id
  AND ur.is_approved = FALSE
  AND ur.is_rejected = FALSE
  ORDER BY ur.match_score DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_mood_similarity TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_activity_similarity TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_context_similarity TO authenticated;
GRANT EXECUTE ON FUNCTION generate_user_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_mood_similarity TO service_role;
GRANT EXECUTE ON FUNCTION calculate_activity_similarity TO service_role;
GRANT EXECUTE ON FUNCTION calculate_context_similarity TO service_role;
GRANT EXECUTE ON FUNCTION generate_user_recommendations TO service_role; 