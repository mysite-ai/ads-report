const API_KEY = process.env.SCRAPECREATORS_API_KEY!;
const BASE_URL = 'https://api.scrapecreators.com';

export interface VideoData {
  id: string;
  postId: string;
  url: string;
  videoUrl: string;
  thumbnail: string;
  description: string;
  createdAt: string;
  viewCount: number;
  playTimeMs: number;
  platform: 'facebook' | 'instagram';
  author: {
    id: string;
    name: string;
    url: string;
  };
}

export interface FetchVideosResult {
  videos: VideoData[];
  profileName: string;
  profileUrl: string;
  error?: string;
  rawResponse?: any;
}

export interface TranscriptResult {
  transcript: string;
  error?: string;
}

export async function fetchFacebookReels(url: string, limit: number = 10): Promise<FetchVideosResult> {
  console.log(`[API] Fetching FB reels: ${url}`);
  
  try {
    const apiUrl = `${BASE_URL}/v1/facebook/profile/reels?url=${encodeURIComponent(url)}`;
    console.log(`[API] Request URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: { 'x-api-key': API_KEY }
    });

    const data = await response.json();
    console.log(`[API] Response status: ${response.status}`);
    console.log(`[API] Response data:`, JSON.stringify(data, null, 2).slice(0, 500));

    if (!data.success) {
      return {
        videos: [],
        profileName: '',
        profileUrl: url,
        error: data.error || data.message || 'API returned success=false',
        rawResponse: data
      };
    }

    const reels = data.reels || [];
    console.log(`[API] Found ${reels.length} reels`);

    const videos: VideoData[] = reels.slice(0, limit).map((reel: any) => ({
      id: reel.id || reel.video_id || '',
      postId: reel.post_id || '',
      url: reel.url || '',
      videoUrl: reel.video_url || '',
      thumbnail: reel.thumbnail || '',
      description: reel.description || '',
      createdAt: reel.creation_time || '',
      viewCount: reel.view_count || 0,
      playTimeMs: reel.play_time_in_ms || 0,
      platform: 'facebook' as const,
      author: {
        id: reel.author?.id || '',
        name: reel.author?.name || '',
        url: reel.author?.url || ''
      }
    }));

    return {
      videos,
      profileName: videos[0]?.author?.name || '',
      profileUrl: url,
      rawResponse: data
    };
  } catch (error) {
    console.error(`[API] Error:`, error);
    return {
      videos: [],
      profileName: '',
      profileUrl: url,
      error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function extractInstagramHandle(url: string): string {
  // Extract handle from URLs like:
  // https://instagram.com/username
  // https://www.instagram.com/username/
  // https://instagram.com/username?param=value
  const match = url.match(/instagram\.com\/([^\/\?]+)/i);
  if (match && match[1]) {
    return match[1].replace('@', '');
  }
  // If no match, assume the input IS the handle
  return url.replace('@', '').replace(/\//g, '');
}

export async function fetchInstagramReels(url: string, limit: number = 10): Promise<FetchVideosResult> {
  console.log(`[API] Fetching IG reels: ${url}`);
  
  const handle = extractInstagramHandle(url);
  console.log(`[API] Extracted handle: ${handle}`);
  
  try {
    const apiUrl = `${BASE_URL}/v1/instagram/user/reels?handle=${encodeURIComponent(handle)}`;
    console.log(`[API] Request URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: { 'x-api-key': API_KEY }
    });

    const data = await response.json();
    console.log(`[API] Response status: ${response.status}`);
    console.log(`[API] Response data:`, JSON.stringify(data, null, 2).slice(0, 500));

    // Instagram API returns items[] with media objects
    const items = data.items || data.reels || [];
    console.log(`[API] Found ${items.length} reels`);

    if (items.length === 0 && data.error) {
      return {
        videos: [],
        profileName: handle,
        profileUrl: url,
        error: data.error || data.message || 'No reels found',
        rawResponse: data
      };
    }

    const videos: VideoData[] = items.slice(0, limit).map((item: any) => {
      const media = item.media || item;
      const user = media.user || media.owner || {};
      return {
        id: media.pk || media.id || '',
        postId: media.code || '',
        url: media.code ? `https://instagram.com/reel/${media.code}` : '',
        videoUrl: media.video_url || '',
        thumbnail: media.display_uri || media.thumbnail_url || media.image_versions2?.candidates?.[0]?.url || '',
        description: media.caption?.text || media.caption || '',
        createdAt: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : '',
        viewCount: media.play_count || media.ig_play_count || media.view_count || 0,
        playTimeMs: (media.video_duration || 0) * 1000,
        platform: 'instagram' as const,
        author: {
          id: user.pk || user.id || '',
          name: user.username || '',
          url: `https://instagram.com/${user.username || handle}`
        }
      };
    });

    return {
      videos,
      profileName: videos[0]?.author?.name || handle,
      profileUrl: url,
      rawResponse: data
    };
  } catch (error) {
    console.error(`[API] Error:`, error);
    return {
      videos: [],
      profileName: '',
      profileUrl: url,
      error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || i === retries) {
        return response;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

export async function getTranscript(postUrl: string, platform: 'facebook' | 'instagram'): Promise<TranscriptResult> {
  console.log(`[API] Getting transcript for: ${postUrl}`);
  
  if (!postUrl) {
    return { transcript: '', error: 'No post URL provided' };
  }
  
  try {
    let apiUrl: string;
    
    if (platform === 'facebook') {
      apiUrl = `${BASE_URL}/v1/facebook/post/transcript?url=${encodeURIComponent(postUrl)}`;
    } else {
      // Instagram uses 'url' parameter pointing to post/reel URL
      apiUrl = `${BASE_URL}/v2/instagram/media/transcript?url=${encodeURIComponent(postUrl)}`;
    }
    
    console.log(`[API] Transcript URL: ${apiUrl}`);
    
    const response = await fetchWithRetry(apiUrl, {
      headers: { 'x-api-key': API_KEY }
    }, 2);

    // Check if response is not OK (503, etc)
    if (!response.ok) {
      const statusText = response.statusText || `HTTP ${response.status}`;
      console.log(`[API] Transcript HTTP error: ${response.status} ${statusText}`);
      return {
        transcript: '',
        error: statusText
      };
    }

    const data = await response.json();
    console.log(`[API] Transcript response:`, JSON.stringify(data, null, 2).slice(0, 300));

    if (!data.success) {
      return {
        transcript: '',
        error: data.error || data.message || 'Transcript API failed'
      };
    }

    return {
      transcript: data.transcript || ''
    };
  } catch (error) {
    console.error(`[API] Transcript error:`, error);
    return {
      transcript: '',
      error: `Transcript Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function detectPlatform(url: string): 'facebook' | 'instagram' | 'unknown' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
    return 'facebook';
  }
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return 'instagram';
  }
  return 'unknown';
}

export async function fetchAllVideos(url: string, limit: number = 10): Promise<FetchVideosResult> {
  const platform = detectPlatform(url);
  console.log(`[API] Platform detected: ${platform}`);

  if (platform === 'unknown') {
    return {
      videos: [],
      profileName: '',
      profileUrl: url,
      error: 'Nierozpoznana platforma. Podaj URL do profilu Facebook lub Instagram.'
    };
  }

  if (platform === 'facebook') {
    return fetchFacebookReels(url, limit);
  }

  return fetchInstagramReels(url, limit);
}
