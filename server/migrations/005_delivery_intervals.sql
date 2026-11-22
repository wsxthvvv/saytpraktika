UPDATE site_settings
SET value = jsonb_set(value, '{intervals}', '[]'::jsonb, TRUE), updated_at = NOW()
WHERE key = 'delivery' AND NOT (value ? 'intervals');
