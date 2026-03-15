-- Supabase Schema for Content Analysis Tool
-- Run this in Supabase SQL Editor

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  profile_url TEXT NOT NULL UNIQUE,
  follower_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  url TEXT,
  video_url TEXT,
  thumbnail TEXT,
  caption TEXT,
  timestamp TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id, platform)
);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language TEXT,
  duration FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual video analyses
CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  summary TEXT,
  topics TEXT[],
  sentiment TEXT,
  call_to_action TEXT,
  target_audience TEXT,
  content_type TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  engagement_prediction TEXT,
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk analyses for entire profiles
CREATE TABLE IF NOT EXISTS bulk_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  top_performing_content TEXT[],
  common_themes TEXT[],
  audience_preferences TEXT[],
  content_gaps TEXT[],
  strategic_recommendations TEXT[],
  videos_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_restaurant ON videos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_video ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_analyses_video ON analyses(video_id);
CREATE INDEX IF NOT EXISTS idx_bulk_analyses_restaurant ON bulk_analyses(restaurant_id);

-- Row Level Security (optional, enable if needed)
-- ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bulk_analyses ENABLE ROW LEVEL SECURITY;
