import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured - missing SUPABASE_URL or key');
    return null;
  }
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export interface Restaurant {
  id?: string;
  name: string;
  platform: 'facebook' | 'instagram';
  profile_url: string;
  follower_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Video {
  id?: string;
  restaurant_id: string;
  external_id: string;
  platform: 'facebook' | 'instagram';
  url: string;
  video_url: string;
  thumbnail?: string;
  caption?: string;
  timestamp?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at?: string;
}

export interface Transcript {
  id?: string;
  video_id: string;
  text: string;
  language?: string;
  duration?: number;
  created_at?: string;
}

export interface Analysis {
  id?: string;
  video_id: string;
  summary: string;
  topics: string[];
  sentiment: string;
  call_to_action?: string;
  target_audience?: string;
  content_type?: string;
  strengths: string[];
  weaknesses: string[];
  engagement_prediction: string;
  recommendations: string[];
  created_at?: string;
}

export interface BulkAnalysis {
  id?: string;
  restaurant_id: string;
  top_performing_content: string[];
  common_themes: string[];
  audience_preferences: string[];
  content_gaps: string[];
  strategic_recommendations: string[];
  videos_analyzed: number;
  created_at?: string;
}

export async function upsertRestaurant(restaurant: Restaurant): Promise<{ data: Restaurant | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data: existing } = await client
      .from('restaurants')
      .select('id')
      .eq('profile_url', restaurant.profile_url)
      .single();

    if (existing) {
      const { data, error } = await client
        .from('restaurants')
        .update({
          name: restaurant.name,
          follower_count: restaurant.follower_count,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      return { data, error: null };
    }

    const { data, error } = await client
      .from('restaurants')
      .insert(restaurant)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function insertVideo(video: Video): Promise<{ data: Video | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data: existing } = await client
      .from('videos')
      .select('id')
      .eq('external_id', video.external_id)
      .eq('platform', video.platform)
      .single();

    if (existing) {
      return { data: { ...video, id: existing.id }, error: null };
    }

    const { data, error } = await client
      .from('videos')
      .insert(video)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function insertTranscript(transcript: Transcript): Promise<{ data: Transcript | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await client
      .from('transcripts')
      .insert(transcript)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function insertAnalysis(analysis: Analysis): Promise<{ data: Analysis | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await client
      .from('analyses')
      .insert(analysis)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function insertBulkAnalysis(bulkAnalysis: BulkAnalysis): Promise<{ data: BulkAnalysis | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await client
      .from('bulk_analyses')
      .insert(bulkAnalysis)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getRestaurantAnalyses(restaurantId: string): Promise<{ data: BulkAnalysis[] | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await client
      .from('bulk_analyses')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getAllRestaurants(): Promise<{ data: Restaurant[] | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await client
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
