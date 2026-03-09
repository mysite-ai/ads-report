const API_KEY = process.env.SCRAPECREATORS_API_KEY!;
const BASE_URL = 'https://api.scrapecreators.com';

export interface FacebookProfileData {
  name: string;
  followerCount: number;
  likeCount: number;
  category: string;
  profilePicLarge: string;
  adLibrary: {
    adStatus: string;
    pageId: string;
  } | null;
  website: string;
  phone: string;
  address: string;
  error?: string;
}

export interface FacebookAdsData {
  hasActiveAds: boolean;
  adsCount: number;
  ads: Array<{
    id: string;
    pageName: string;
    startDate: string;
    platforms: string[];
    status: string;
  }>;
  error?: string;
}

export async function getFacebookProfile(url: string): Promise<FacebookProfileData> {
  try {
    const response = await fetch(
      `${BASE_URL}/v1/facebook/profile?url=${encodeURIComponent(url)}`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );

    const data = await response.json();

    if (!data.success) {
      return {
        name: '',
        followerCount: 0,
        likeCount: 0,
        category: '',
        profilePicLarge: '',
        adLibrary: null,
        website: '',
        phone: '',
        address: '',
        error: data.error || 'Failed to fetch profile'
      };
    }

    return {
      name: data.name || '',
      followerCount: data.followerCount || 0,
      likeCount: data.likeCount || 0,
      category: data.category || '',
      profilePicLarge: data.profilePicLarge || '',
      adLibrary: data.adLibrary || null,
      website: data.website || '',
      phone: data.phone || '',
      address: data.address || ''
    };
  } catch (error) {
    return {
      name: '',
      followerCount: 0,
      likeCount: 0,
      category: '',
      profilePicLarge: '',
      adLibrary: null,
      website: '',
      phone: '',
      address: '',
      error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function getFacebookPosts(url: string): Promise<{ posts: Array<{ timestamp: string }>, error?: string }> {
  try {
    const response = await fetch(
      `${BASE_URL}/v1/facebook/profile/posts?url=${encodeURIComponent(url)}&limit=5`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );

    const data = await response.json();

    if (!data.success) {
      return { posts: [], error: data.error };
    }

    return {
      posts: data.posts || []
    };
  } catch (error) {
    return { posts: [], error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function getCompanyAds(pageId: string): Promise<FacebookAdsData> {
  try {
    const response = await fetch(
      `${BASE_URL}/v1/facebook/adLibrary/company/ads?page_id=${pageId}&country=PL`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );

    const data = await response.json();

    if (!data.success) {
      return {
        hasActiveAds: false,
        adsCount: 0,
        ads: [],
        error: data.error
      };
    }

    const ads = data.ads || [];
    
    return {
      hasActiveAds: ads.length > 0,
      adsCount: ads.length,
      ads: ads.slice(0, 5).map((ad: any) => ({
        id: ad.id || '',
        pageName: ad.pageName || '',
        startDate: ad.startDate || '',
        platforms: ad.platforms || [],
        status: ad.status || ''
      }))
    };
  } catch (error) {
    return {
      hasActiveAds: false,
      adsCount: 0,
      ads: [],
      error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function searchAdLibrary(searchTerm: string): Promise<FacebookAdsData> {
  try {
    const response = await fetch(
      `${BASE_URL}/v1/facebook/adLibrary/search/ads?query=${encodeURIComponent(searchTerm)}&country=PL&limit=10`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );

    const data = await response.json();

    if (!data.success) {
      return {
        hasActiveAds: false,
        adsCount: 0,
        ads: [],
        error: data.error
      };
    }

    const ads = data.ads || [];
    
    return {
      hasActiveAds: ads.length > 0,
      adsCount: ads.length,
      ads: ads.slice(0, 5).map((ad: any) => ({
        id: ad.id || '',
        pageName: ad.pageName || '',
        startDate: ad.startDate || '',
        platforms: ad.platforms || [],
        status: ad.status || ''
      }))
    };
  } catch (error) {
    return {
      hasActiveAds: false,
      adsCount: 0,
      ads: [],
      error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
