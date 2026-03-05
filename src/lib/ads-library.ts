const APP_ID = process.env.META_APP_ID!;
const APP_SECRET = process.env.META_APP_SECRET!;

export interface AdLibraryAd {
  id: string;
  ad_creation_time?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_snapshot_url?: string;
  page_id?: string;
  page_name?: string;
  publisher_platforms?: string[];
  estimated_audience_size?: {
    lower_bound: number;
    upper_bound: number;
  };
}

export interface AdLibraryResponse {
  ads: AdLibraryAd[];
  totalCount: number;
  hasActiveAds: boolean;
  oldestAdDate: string | null;
  platforms: string[];
  error?: string;
}

async function getAppAccessToken(): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`
  );
  const data = await response.json();
  return data.access_token;
}

export async function searchAdLibrary(pageNameOrId: string): Promise<AdLibraryResponse> {
  try {
    const accessToken = await getAppAccessToken();

    const fields = [
      'id',
      'ad_creation_time',
      'ad_creative_bodies',
      'ad_creative_link_captions', 
      'ad_creative_link_titles',
      'ad_delivery_start_time',
      'ad_snapshot_url',
      'page_id',
      'page_name',
      'publisher_platforms'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      ad_type: 'ALL',
      ad_reached_countries: "['PL']",
      search_terms: pageNameOrId,
      ad_active_status: 'ACTIVE',
      fields: fields,
      limit: '25'
    });

    const response = await fetch(
      `https://graph.facebook.com/v19.0/ads_archive?${params.toString()}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      return {
        ads: [],
        totalCount: 0,
        hasActiveAds: false,
        oldestAdDate: null,
        platforms: [],
        error: data.error.message || 'Błąd pobierania danych z Ad Library'
      };
    }

    const ads: AdLibraryAd[] = data.data || [];
    
    const allPlatforms = new Set<string>();
    let oldestDate: Date | null = null;
    
    for (const ad of ads) {
      ad.publisher_platforms?.forEach(p => allPlatforms.add(p));
      
      if (ad.ad_delivery_start_time) {
        const adDate = new Date(ad.ad_delivery_start_time);
        if (!oldestDate || adDate < oldestDate) {
          oldestDate = adDate;
        }
      }
    }

    return {
      ads,
      totalCount: ads.length,
      hasActiveAds: ads.length > 0,
      oldestAdDate: oldestDate ? oldestDate.toLocaleDateString('pl-PL') : null,
      platforms: Array.from(allPlatforms)
    };
  } catch (error) {
    return {
      ads: [],
      totalCount: 0,
      hasActiveAds: false,
      oldestAdDate: null,
      platforms: [],
      error: `Błąd połączenia: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    };
  }
}

export async function getPageAds(pageId: string): Promise<AdLibraryResponse> {
  try {
    const accessToken = await getAppAccessToken();

    const fields = [
      'id',
      'ad_creation_time',
      'ad_creative_bodies',
      'ad_creative_link_captions',
      'ad_creative_link_titles', 
      'ad_delivery_start_time',
      'ad_snapshot_url',
      'page_id',
      'page_name',
      'publisher_platforms'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      ad_type: 'ALL',
      ad_reached_countries: "['PL']",
      search_page_ids: pageId,
      ad_active_status: 'ACTIVE',
      fields: fields,
      limit: '25'
    });

    const response = await fetch(
      `https://graph.facebook.com/v19.0/ads_archive?${params.toString()}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      return {
        ads: [],
        totalCount: 0,
        hasActiveAds: false,
        oldestAdDate: null,
        platforms: [],
        error: data.error.message
      };
    }

    const ads: AdLibraryAd[] = data.data || [];
    
    const allPlatforms = new Set<string>();
    let oldestDate: Date | null = null;
    
    for (const ad of ads) {
      ad.publisher_platforms?.forEach(p => allPlatforms.add(p));
      
      if (ad.ad_delivery_start_time) {
        const adDate = new Date(ad.ad_delivery_start_time);
        if (!oldestDate || adDate < oldestDate) {
          oldestDate = adDate;
        }
      }
    }

    return {
      ads,
      totalCount: ads.length,
      hasActiveAds: ads.length > 0,
      oldestAdDate: oldestDate ? oldestDate.toLocaleDateString('pl-PL') : null,
      platforms: Array.from(allPlatforms)
    };
  } catch (error) {
    return {
      ads: [],
      totalCount: 0,
      hasActiveAds: false,
      oldestAdDate: null,
      platforms: [],
      error: `Błąd połączenia: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    };
  }
}

export function analyzeAds(response: AdLibraryResponse): {
  adsScore: number;
  summary: string;
  recommendations: string[];
} {
  if (response.error) {
    return {
      adsScore: 0,
      summary: 'Nie udało się sprawdzić reklam',
      recommendations: ['Sprawdź czy nazwa strony jest poprawna']
    };
  }

  if (!response.hasActiveAds) {
    return {
      adsScore: 2,
      summary: 'Brak aktywnych reklam w Meta Ads',
      recommendations: [
        'Restauracja nie prowadzi obecnie żadnych kampanii reklamowych',
        'Konkurencja może przejmować klientów przez płatne reklamy',
        'Warto rozważyć kampanie na zamówienia online i rezerwacje'
      ]
    };
  }

  let score = 5;
  const recommendations: string[] = [];

  if (response.totalCount >= 5) {
    score += 2;
  } else if (response.totalCount >= 2) {
    score += 1;
  } else {
    recommendations.push('Mała liczba aktywnych reklam - warto zwiększyć');
  }

  if (response.platforms.includes('facebook') && response.platforms.includes('instagram')) {
    score += 1;
  } else if (response.platforms.length === 1) {
    recommendations.push(`Reklamy tylko na ${response.platforms[0]} - warto dodać inne platformy`);
  }

  score = Math.max(1, Math.min(10, score));

  const summary = `${response.totalCount} aktywnych reklam na ${response.platforms.join(', ')}`;

  return {
    adsScore: score,
    summary,
    recommendations
  };
}
