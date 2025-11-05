-- =====================================================
-- AI AGENTS SYSTEM - Complete Database Schema
-- =====================================================

-- AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_avatar_url TEXT,
  agent_description TEXT,
  agent_personality TEXT NOT NULL DEFAULT 'helpful and professional',
  agent_purpose TEXT NOT NULL,
  knowledge_base TEXT,
  auto_reply_enabled BOOLEAN DEFAULT false,
  response_delay_seconds INTEGER DEFAULT 2,
  greeting_message TEXT,
  is_active BOOLEAN DEFAULT true,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Training Data
CREATE TABLE IF NOT EXISTS ai_agent_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Analytics
CREATE TABLE IF NOT EXISTS ai_agent_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  average_response_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, date)
);

-- Developer Profiles table (for Mini Apps)
CREATE TABLE IF NOT EXISTS developer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  developer_name TEXT NOT NULL,
  developer_email TEXT NOT NULL,
  company_name TEXT,
  website_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  total_apps INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- App Submissions table
CREATE TABLE IF NOT EXISTS app_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developer_profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_url TEXT NOT NULL,
  app_description TEXT,
  app_category TEXT NOT NULL,
  app_icon_url TEXT,
  submission_status TEXT NOT NULL DEFAULT 'pending' CHECK (submission_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  revenue_share_percentage INTEGER DEFAULT 20,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_submissions ENABLE ROW LEVEL SECURITY;

-- AI Agents Policies
CREATE POLICY "Users can view their own AI agents"
  ON ai_agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI agents"
  ON ai_agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI agents"
  ON ai_agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI agents"
  ON ai_agents FOR DELETE
  USING (auth.uid() = user_id);

-- AI Agent Training Policies
CREATE POLICY "Users can view training data for their agents"
  ON ai_agent_training FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_agents
      WHERE ai_agents.id = ai_agent_training.agent_id
      AND ai_agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add training data to their agents"
  ON ai_agent_training FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_agents
      WHERE ai_agents.id = ai_agent_training.agent_id
      AND ai_agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete training data from their agents"
  ON ai_agent_training FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_agents
      WHERE ai_agents.id = ai_agent_training.agent_id
      AND ai_agents.user_id = auth.uid()
    )
  );

-- AI Agent Analytics Policies
CREATE POLICY "Users can view analytics for their agents"
  ON ai_agent_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_agents
      WHERE ai_agents.id = ai_agent_analytics.agent_id
      AND ai_agents.user_id = auth.uid()
    )
  );

-- Developer Profiles Policies
CREATE POLICY "Users can view their own developer profile"
  ON developer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own developer profile"
  ON developer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own developer profile"
  ON developer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- App Submissions Policies
CREATE POLICY "Users can view their own app submissions"
  ON app_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM developer_profiles
      WHERE developer_profiles.id = app_submissions.developer_id
      AND developer_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create app submissions"
  ON app_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM developer_profiles
      WHERE developer_profiles.id = app_submissions.developer_id
      AND developer_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all app submissions"
  ON app_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update app submissions"
  ON app_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_training_agent_id ON ai_agent_training(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_analytics_agent_id ON ai_agent_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_developer_profiles_user_id ON developer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_app_submissions_developer_id ON app_submissions(developer_id);
CREATE INDEX IF NOT EXISTS idx_app_submissions_status ON app_submissions(submission_status);