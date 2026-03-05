const APP_ID = process.env.META_APP_ID!;
const APP_SECRET = process.env.META_APP_SECRET!;

export interface FacebookPageData {
  id: string;
  name: string;
  username?: string;
  category?: string;
  followers_count?: number;
  fan_count?: number;
  about?: string;
  website?: string;
  phone?: string;
  location?: {
    city?: string;
    country?: string;
    street?: string;
  };
  cover?: {
    source: string;
  };
  picture?: {
    data: {
      url: string;
    };
  };
  posts?: {
    data: Array<{
      id: string;
      message?: string;
      created_time: string;
      shares?: { count: number };
      reactions?: { summary: { total_count: number } };
      comments?: { summary: { total_count: number } };
    }>;
  };
  error?: string;
}

async function getAppAccessToken(): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`
  );
  const data = await response.json();
  return data.access_token;
}

export function extractPageIdFromUrl(url: string): string | null {
  const patterns = [
    /facebook\.com\/([^\/\?]+)/i,
    /fb\.com\/([^\/\?]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const id = match[1];
      if (!['pages', 'profile.php', 'sharer', 'share', 'login'].includes(id)) {
        return id;
      }
    }
  }
  
  const profileMatch = url.match(/profile\.php\?id=(\d+)/);
  if (profileMatch) {
    return profileMatch[1];
  }
  
  return null;
}

export async function getPageData(pageIdOrUrl: string): Promise<FacebookPageData> {
  const pageId = pageIdOrUrl.includes('facebook.com') || pageIdOrUrl.includes('fb.com')
    ? extractPageIdFromUrl(pageIdOrUrl)
    : pageIdOrUrl;
    
  if (!pageId) {
    return { id: '', name: '', error: 'Nieprawidłowy URL lub ID strony' };
  }

  try {
    const accessToken = await getAppAccessToken();
    
    const fields = [
      'id',
      'name',
      'username',
      'category',
      'followers_count',
      'fan_count',
      'about',
      'website',
      'phone',
      'location',
      'cover',
      'picture.type(large)',
      'posts.limit(10){id,message,created_time,shares,reactions.summary(true),comments.summary(true)}'
    ].join(',');

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=${fields}&access_token=${accessToken}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      return { 
        id: pageId, 
        name: pageId, 
        error: data.error.message || 'Nie udało się pobrać danych strony'
      };
    }
    
    return data as FacebookPageData;
  } catch (error) {
    return { 
      id: pageId || '', 
      name: pageId || '', 
      error: `Błąd połączenia: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    };
  }
}

export function analyzePageActivity(page: FacebookPageData): {
  lastPostDate: string | null;
  daysSinceLastPost: number | null;
  avgEngagement: number;
  postFrequency: string;
  activityScore: number;
} {
  const posts = page.posts?.data || [];
  
  if (posts.length === 0) {
    return {
      lastPostDate: null,
      daysSinceLastPost: null,
      avgEngagement: 0,
      postFrequency: 'Brak danych',
      activityScore: 0
    };
  }

  const lastPost = posts[0];
  const lastPostDate = new Date(lastPost.created_time);
  const now = new Date();
  const daysSinceLastPost = Math.floor((now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24));

  let totalEngagement = 0;
  posts.forEach(post => {
    const reactions = post.reactions?.summary?.total_count || 0;
    const comments = post.comments?.summary?.total_count || 0;
    const shares = post.shares?.count || 0;
    totalEngagement += reactions + comments + shares;
  });
  const avgEngagement = Math.round(totalEngagement / posts.length);

  let postFrequency = 'Nieregularna';
  if (posts.length >= 2) {
    const firstPost = new Date(posts[posts.length - 1].created_time);
    const daysBetween = (lastPostDate.getTime() - firstPost.getTime()) / (1000 * 60 * 60 * 24);
    const postsPerWeek = (posts.length / daysBetween) * 7;
    
    if (postsPerWeek >= 7) postFrequency = 'Codziennie';
    else if (postsPerWeek >= 3) postFrequency = 'Kilka razy w tygodniu';
    else if (postsPerWeek >= 1) postFrequency = 'Raz w tygodniu';
    else if (postsPerWeek >= 0.25) postFrequency = 'Raz w miesiącu';
    else postFrequency = 'Rzadziej niż raz w miesiącu';
  }

  let activityScore = 5;
  if (daysSinceLastPost <= 1) activityScore += 2;
  else if (daysSinceLastPost <= 7) activityScore += 1;
  else if (daysSinceLastPost > 30) activityScore -= 2;
  else if (daysSinceLastPost > 14) activityScore -= 1;

  if (avgEngagement > 100) activityScore += 2;
  else if (avgEngagement > 30) activityScore += 1;
  else if (avgEngagement < 5) activityScore -= 1;

  activityScore = Math.max(1, Math.min(10, activityScore));

  return {
    lastPostDate: lastPostDate.toLocaleDateString('pl-PL'),
    daysSinceLastPost,
    avgEngagement,
    postFrequency,
    activityScore
  };
}
