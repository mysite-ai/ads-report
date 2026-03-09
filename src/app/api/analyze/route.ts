import { NextRequest, NextResponse } from 'next/server';
import { getFacebookProfile, getFacebookPosts, getCompanyAds, searchAdLibrary } from '@/lib/scrapecreators';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { facebookUrl } = body;

    if (!facebookUrl) {
      return NextResponse.json(
        { error: 'Facebook URL jest wymagany' },
        { status: 400 }
      );
    }

    // Get profile data
    const profileData = await getFacebookProfile(facebookUrl);
    
    if (profileData.error) {
      return NextResponse.json(
        { error: profileData.error },
        { status: 400 }
      );
    }

    // Get posts to check last activity
    const postsData = await getFacebookPosts(facebookUrl);
    
    // Calculate days since last post
    let daysSinceLastPost: number | null = null;
    let lastPostDate: string | null = null;
    
    if (postsData.posts && postsData.posts.length > 0) {
      const lastPost = postsData.posts[0];
      if (lastPost.timestamp) {
        const postDate = new Date(lastPost.timestamp);
        const now = new Date();
        daysSinceLastPost = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastPost === 0) lastPostDate = 'Dzisiaj';
        else if (daysSinceLastPost === 1) lastPostDate = 'Wczoraj';
        else lastPostDate = `${daysSinceLastPost} dni temu`;
      }
    }

    // Check ads - first check if profile has ads info, then search ad library
    let adsData: { hasActiveAds: boolean; adsCount: number; ads: any[]; error?: string } = { hasActiveAds: false, adsCount: 0, ads: [] };
    
    // Check from profile adLibrary status
    const hasAdsFromProfile = profileData.adLibrary?.adStatus?.includes('running ads');
    
    if (profileData.adLibrary?.pageId) {
      adsData = await getCompanyAds(profileData.adLibrary.pageId);
    } else {
      // Fallback to search
      const searchTerm = profileData.name || extractSearchTerm(facebookUrl);
      adsData = await searchAdLibrary(searchTerm);
    }

    // If profile says running ads but we didn't find any, trust profile
    if (hasAdsFromProfile && !adsData.hasActiveAds) {
      adsData.hasActiveAds = true;
      adsData.adsCount = 1;
    }

    // Calculate scores
    const activityScore = calculateActivityScore(daysSinceLastPost, profileData.followerCount);
    const adsScore = calculateAdsScore(adsData.hasActiveAds, adsData.adsCount);
    const engagementScore = 5; // Neutral - can't measure without more API calls
    const overallScore = Math.round((activityScore + adsScore + engagementScore) / 3);

    // Generate insights
    const { problems, recommendations } = generateInsights(
      daysSinceLastPost,
      profileData.followerCount,
      adsData.hasActiveAds,
      adsData.adsCount
    );

    return NextResponse.json({
      success: true,
      data: {
        page: {
          name: profileData.name,
          followers: profileData.followerCount,
          likes: profileData.likeCount,
          category: profileData.category,
          profileImage: profileData.profilePicLarge,
          about: profileData.address
        },
        activity: {
          lastPostDate,
          daysSinceLastPost,
          postsPerWeek: daysSinceLastPost !== null && daysSinceLastPost <= 7 ? Math.round(7 / (daysSinceLastPost || 1)) : 0,
          activityScore
        },
        engagement: {
          engagementRate: null,
          avgReactions: null,
          engagementScore
        },
        ads: {
          hasActiveAds: adsData.hasActiveAds,
          adsCount: adsData.adsCount,
          ads: adsData.ads,
          adsScore
        },
        score: {
          overall: overallScore,
          activity: activityScore,
          ads: adsScore,
          engagement: engagementScore
        },
        problems,
        recommendations,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas analizy', details: error instanceof Error ? error.message : 'Nieznany błąd' },
      { status: 500 }
    );
  }
}

function extractSearchTerm(url: string): string {
  const match = url.match(/facebook\.com\/([^\/\?]+)/i);
  if (match && match[1]) {
    return match[1].replace(/[._-]/g, ' ');
  }
  return url;
}

function calculateActivityScore(daysSinceLastPost: number | null, followers: number): number {
  let score = 5;

  if (daysSinceLastPost !== null) {
    if (daysSinceLastPost <= 1) score += 3;
    else if (daysSinceLastPost <= 3) score += 2;
    else if (daysSinceLastPost <= 7) score += 1;
    else if (daysSinceLastPost > 30) score -= 3;
    else if (daysSinceLastPost > 14) score -= 2;
    else if (daysSinceLastPost > 7) score -= 1;
  } else {
    score -= 1;
  }

  if (followers > 10000) score += 1;
  else if (followers < 500) score -= 1;

  return Math.max(1, Math.min(10, score));
}

function calculateAdsScore(hasActiveAds: boolean, adsCount: number): number {
  if (!hasActiveAds) return 2;
  
  if (adsCount >= 10) return 9;
  if (adsCount >= 5) return 8;
  if (adsCount >= 3) return 7;
  return 5;
}

function generateInsights(
  daysSinceLastPost: number | null,
  followers: number,
  hasAds: boolean,
  adsCount: number
): { problems: string[]; recommendations: string[] } {
  const problems: string[] = [];
  const recommendations: string[] = [];

  if (daysSinceLastPost !== null) {
    if (daysSinceLastPost > 30) {
      problems.push(`Ostatni post ${daysSinceLastPost} dni temu - klienci mogą myśleć że restauracja jest zamknięta`);
      recommendations.push('Regularne posty (min. 2-3x w tygodniu) budują zaufanie');
    } else if (daysSinceLastPost > 14) {
      problems.push(`Ostatni post ${daysSinceLastPost} dni temu - zbyt rzadka aktywność`);
      recommendations.push('Warto publikować posty przynajmniej 2-3 razy w tygodniu');
    } else if (daysSinceLastPost > 7) {
      problems.push('Posty rzadziej niż raz w tygodniu - algorytm obniża zasięgi');
    }
  }

  if (followers > 0 && followers < 1000) {
    problems.push('Mała liczba obserwujących - ograniczony zasięg organiczny');
    recommendations.push('Kampanie na zwiększenie obserwujących pomogą budować społeczność');
  }

  if (!hasAds) {
    problems.push('Brak aktywnych reklam - restauracja niewidoczna dla nowych klientów');
    recommendations.push('Kampanie reklamowe zwiększą liczbę zamówień i rezerwacji');
    recommendations.push('Konkurencja prawdopodobnie już prowadzi płatne kampanie');
  } else if (adsCount < 3) {
    problems.push('Mała liczba aktywnych reklam - ograniczony zasięg kampanii');
    recommendations.push('Więcej wariantów reklam pozwala testować różne przekazy');
  }

  if (recommendations.length < 3) {
    recommendations.push('Profesjonalne zdjęcia jedzenia zwiększają zaangażowanie');
    recommendations.push('Stories i Reels mają największe zasięgi organiczne');
  }

  return { problems, recommendations };
}
