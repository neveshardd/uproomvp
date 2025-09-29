-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the handle_updated_at function (alias for update_updated_at_column)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create user_status_mark_is_latest_before function
CREATE OR REPLACE FUNCTION user_status_mark_is_latest_before()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark all other status records for this user as not latest
    UPDATE user_status 
    SET is_latest = false 
    WHERE user_id = NEW.user_id AND id != COALESCE(NEW.id, gen_random_uuid());
    
    -- Mark the new/updated record as latest
    NEW.is_latest = true;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create user_status_unset_others_after function
CREATE OR REPLACE FUNCTION user_status_unset_others_after()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure only one status is marked as latest per user
    UPDATE user_status 
    SET is_latest = false 
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_latest = true;
    
    RETURN NEW;
END;
$$ language 'plpgsql';