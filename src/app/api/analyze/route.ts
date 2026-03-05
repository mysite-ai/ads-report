import { NextRequest, NextResponse } from 'next/server';
import { scrapeFacebookPage, scrapeAdLibrary } from '@/lib/scraper';

export const maxDuration = 60; // Allow up to 60 seconds for scraping

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

    // Extract search term for Ad Library
    const searchTerm = extractSearchTerm(facebookUrl);

    // Scrape data in parallel
    const [pageData, adsData] = await Promise.all([
      scrapeFacebookPage(facebookUrl),
      scrapeAdLibrary(searchTerm)
    ]);

    // Calculate scores
    const activityScore = calculateActivityScore(pageData);
    const adsScore = calculateAdsScore(adsData);
    const engagementScore = calculateEngagementScore(pageData.engagementRate);
    const overallScore = Math.round((activityScore + adsScore + engagementScore) / 3);

    // Generate problems and recommendations
    const { problems, recommendations } = generateInsights(pageData, adsData);

    return NextResponse.json({
      success: true,
      data: {
        page: {
          name: pageData.name,
          followers: pageData.followers,
          likes: pageData.likes,
          category: pageData.category,
          profileImage: pageData.profileImage,
          about: pageData.about,
          error: pageData.error
        },
        activity: {
          lastPostDate: pageData.lastPostDate,
          daysSinceLastPost: pageData.daysSinceLastPost,
          postsPerWeek: pageData.postsPerWeek,
          activityScore
        },
        engagement: {
          engagementRate: pageData.engagementRate,
          avgReactions: pageData.avgReactions,
          engagementScore
        },
        ads: {
          hasActiveAds: adsData.hasActiveAds,
          adsCount: adsData.adsCount,
          ads: adsData.ads,
          adsScore,
          error: adsData.error
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
  if (!url.includes('facebook.com') && !url.includes('fb.com')) {
    return url;
  }
  
  const match = url.match(/facebook\.com\/([^\/\?]+)/i) || url.match(/fb\.com\/([^\/\?]+)/i);
  if (match && match[1]) {
    const id = match[1];
    if (!['pages', 'profile.php', 'sharer', 'share', 'login'].includes(id)) {
      return id.replace(/[._-]/g, ' ');
    }
  }
  
  return url;
}

function calculateActivityScore(pageData: { daysSinceLastPost: number | null; followers: number; postsPerWeek: number }): number {
  let score = 5;

  if (pageData.daysSinceLastPost !== null) {
    if (pageData.daysSinceLastPost <= 1) score += 3;
    else if (pageData.daysSinceLastPost <= 3) score += 2;
    else if (pageData.daysSinceLastPost <= 7) score += 1;
    else if (pageData.daysSinceLastPost > 30) score -= 3;
    else if (pageData.daysSinceLastPost > 14) score -= 2;
    else if (pageData.daysSinceLastPost > 7) score -= 1;
  } else {
    score -= 2; // Can't determine activity
  }

  if (pageData.followers > 10000) score += 1;
  else if (pageData.followers < 500) score -= 1;

  if (pageData.postsPerWeek >= 5) score += 1;
  else if (pageData.postsPerWeek <= 1) score -= 1;

  return Math.max(1, Math.min(10, score));
}

function calculateAdsScore(adsData: { hasActiveAds: boolean; adsCount: number }): number {
  if (!adsData.hasActiveAds) return 2;
  
  let score = 5;
  if (adsData.adsCount >= 10) score = 9;
  else if (adsData.adsCount >= 5) score = 8;
  else if (adsData.adsCount >= 3) score = 7;
  else if (adsData.adsCount >= 1) score = 5;

  return score;
}

function calculateEngagementScore(engagementRate: number | null): number {
  if (engagementRate === null) return 5; // Neutral if we couldn't measure
  
  // Restaurant pages typically have 1-5% engagement rate
  // >5% = excellent, 2-5% = good, 1-2% = average, <1% = low
  if (engagementRate >= 5) return 10;
  if (engagementRate >= 3) return 8;
  if (engagementRate >= 2) return 7;
  if (engagementRate >= 1) return 5;
  if (engagementRate >= 0.5) return 4;
  return 2;
}

function generateInsights(pageData: any, adsData: any): { problems: string[]; recommendations: string[] } {
  const problems: string[] = [];
  const recommendations: string[] = [];

  // Page data issues
  if (pageData.error) {
    problems.push('Nie udało się w pełni pobrać danych strony FB');
  }

  // Activity issues
  if (pageData.daysSinceLastPost !== null) {
    if (pageData.daysSinceLastPost > 30) {
      problems.push(`Ostatni post ${pageData.daysSinceLastPost} dni temu - klienci mogą myśleć że restauracja jest zamknięta`);
      recommendations.push('Regularne posty (min. 2-3x w tygodniu) budują zaufanie i przypominają o restauracji');
    } else if (pageData.daysSinceLastPost > 14) {
      problems.push(`Ostatni post ${pageData.daysSinceLastPost} dni temu - zbyt rzadka aktywność`);
      recommendations.push('Warto publikować posty przynajmniej 2-3 razy w tygodniu');
    } else if (pageData.daysSinceLastPost > 7) {
      problems.push('Posty rzadziej niż raz w tygodniu - algorytm obniża zasięgi');
    }
  }

  // Followers issues
  if (pageData.followers > 0 && pageData.followers < 1000) {
    problems.push('Mała liczba obserwujących - ograniczony zasięg organiczny');
    recommendations.push('Kampanie na zwiększenie liczby obserwujących pomogą budować społeczność');
  }

  // Engagement issues
  if (pageData.engagementRate !== null && pageData.engagementRate !== undefined) {
    if (pageData.engagementRate < 1) {
      problems.push(`Niski engagement rate (${pageData.engagementRate}%) - posty nie angażują obserwujących`);
      recommendations.push('Treści interaktywne (pytania, ankiety, konkursy) zwiększą zaangażowanie');
    } else if (pageData.engagementRate < 2) {
      problems.push(`Przeciętny engagement rate (${pageData.engagementRate}%) - jest potencjał do poprawy`);
    }
  }

  // Ads issues
  if (!adsData.hasActiveAds) {
    problems.push('Brak aktywnych reklam - restauracja jest niewidoczna dla nowych klientów szukających miejsca do jedzenia');
    recommendations.push('Kampanie reklamowe na Facebooku i Instagramie zwiększą liczbę zamówień i rezerwacji');
    recommendations.push('Konkurencja prawdopodobnie już prowadzi płatne kampanie i przejmuje klientów');
  } else if (adsData.adsCount < 3) {
    problems.push('Mała liczba aktywnych reklam - ograniczony zasięg kampanii');
    recommendations.push('Więcej wariantów reklam pozwala testować różne przekazy i grupy docelowe');
  }

  // General recommendations
  if (recommendations.length < 4) {
    recommendations.push('Profesjonalne zdjęcia jedzenia znacząco zwiększają zaangażowanie');
    recommendations.push('Stories i Reels mają obecnie największe zasięgi organiczne');
    recommendations.push('Odpowiadanie na komentarze i wiadomości buduje relacje z klientami');
  }

  return { problems, recommendations };
}
