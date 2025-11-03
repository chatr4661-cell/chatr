-- Update fame_cam_posts table to support full FameCam functionality
ALTER TABLE fame_cam_posts 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS media_url text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'photo';

-- Update RLS policies for fame_cam_posts
DROP POLICY IF EXISTS "Users can create their own posts" ON fame_cam_posts;
DROP POLICY IF EXISTS "Users can view all posts" ON fame_cam_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON fame_cam_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON fame_cam_posts;

CREATE POLICY "Users can create their own posts"
  ON fame_cam_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all posts"
  ON fame_cam_posts FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own posts"
  ON fame_cam_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON fame_cam_posts FOR DELETE
  USING (auth.uid() = user_id);