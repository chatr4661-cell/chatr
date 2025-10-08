-- Add privacy column to stories if not exists
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'contacts' CHECK (privacy IN ('contacts', 'public', 'selected'));

-- Create story_views table
CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS on story_views
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Story Views RLS Policies
CREATE POLICY "Users can create story views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Story owners can see who viewed their stories"
  ON story_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_views.story_id
    AND stories.user_id = auth.uid()
  ));

CREATE POLICY "Viewers can see their own views"
  ON story_views FOR SELECT
  USING (auth.uid() = viewer_id);

-- Communities Feature (extend conversations table)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS community_description TEXT;

-- Create simple indexes without predicates
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_conversations_is_community ON conversations(is_community, is_public);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE story_views;