-- Fix for the generate_user_recommendations function to handle duplicate key errors
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
      up.user_id,
      (
        (calculate_mood_similarity(p_user_id, up.user_id) * COALESCE((p.connection_preferences->>'mood_match_weight')::float, 0.5)) +
        (calculate_activity_similarity(p_user_id, up.user_id) * COALESCE((p.connection_preferences->>'activity_match_weight')::float, 0.3)) +
        (calculate_context_similarity(p_user_id, up.user_id) * COALESCE((p.connection_preferences->>'context_match_weight')::float, 0.2))
      ) as match_score,
      calculate_mood_similarity(p_user_id, up.user_id) as mood_similarity,
      calculate_activity_similarity(p_user_id, up.user_id) as activity_similarity,
      calculate_context_similarity(p_user_id, up.user_id) as context_similarity
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
    ORDER BY match_score DESC
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
    pr.user_id,
    pr.match_score,
    pr.mood_similarity,
    pr.activity_similarity,
    pr.context_similarity
  FROM potential_recommendations pr
  WHERE NOT EXISTS (
    -- Final check to avoid violating the unique constraint
    SELECT 1 FROM user_recommendations ur
    WHERE ur.user_id = p_user_id
    AND ur.recommended_user_id = pr.user_id
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

-- Grant necessary permissions for the updated function
GRANT EXECUTE ON FUNCTION generate_user_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION generate_user_recommendations TO service_role; 