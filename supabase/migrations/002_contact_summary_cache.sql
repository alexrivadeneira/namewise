-- Cache the AI-generated relationship summary on the contact row.
-- Nullable so existing contacts are unaffected.
-- Set to NULL whenever a new dictation is linked, triggering a fresh generation.
alter table contacts add column summary text;
