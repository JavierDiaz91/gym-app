-- Run after 007. No seed required. Existing global categories are optional.
CREATE TABLE IF NOT EXISTS training_category_preferences (
 gym_id INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 category_id BIGINT NOT NULL REFERENCES training_categories(id) ON DELETE CASCADE,
 is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 PRIMARY KEY (gym_id,category_id)
);
-- Absence of a preference means the global category is disabled for that gym.
