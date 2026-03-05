import puppeteer, { Browser, Page } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--lang=pl-PL'
      ]
    });
  }
  return browserInstance;
}

export interface ScrapedPageData {
  name: string;
  followers: number;
  likes: number;
  category: string;
  lastPostDate: string | null;
  daysSinceLastPost: number | null;
  postsPerWeek: number;
  about: string;
  profileImage: string;
  engagementRate: number | null;
  avgReactions: number | null;
  error?: string;
}

export interface ScrapedAdsData {
  hasActiveAds: boolean;
  adsCount: number;
  ads: Array<{
    id: string;
    pageName: string;
    text: string;
    startedDate: string;
    platforms: string[];
    imageUrl?: string;
  }>;
  error?: string;
}

export async function scrapeFacebookPage(pageUrl: string): Promise<ScrapedPageData> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Extract page ID/username from URL
    const pageId = extractPageId(pageUrl);
    const url = `https://www.facebook.com/${pageId}/about`;
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait a bit for dynamic content
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const getText = (selector: string): string => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      // Get page name
      let name = '';
      const h1 = document.querySelector('h1');
      if (h1) name = h1.textContent?.trim() || '';

      // Get followers/likes from the page
      let followers = 0;
      let likes = 0;
      
      const allText = document.body.innerText;
      
      // Polish patterns
      const followersMatch = allText.match(/(\d[\d\s,\.]*)\s*(obserwuj|followers|osób obserwuje)/i);
      if (followersMatch) {
        followers = parseInt(followersMatch[1].replace(/[\s,\.]/g, ''));
      }
      
      const likesMatch = allText.match(/(\d[\d\s,\.]*)\s*(polubie|likes|osób lubi)/i);
      if (likesMatch) {
        likes = parseInt(likesMatch[1].replace(/[\s,\.]/g, ''));
      }

      // Get category
      let category = '';
      const categoryEl = document.querySelector('[data-pagelet="ProfileTilesFeed_0"] span') ||
                         document.querySelector('a[href*="/pages/category/"]');
      if (categoryEl) category = categoryEl.textContent?.trim() || '';

      // Get profile image
      let profileImage = '';
      const svgImg = document.querySelector('image[preserveAspectRatio="xMidYMid slice"]') as SVGImageElement | null;
      const htmlImg = document.querySelector('img[data-imgperflogname="profileCoverPhoto"]') as HTMLImageElement | null;
      if (svgImg && svgImg.href) {
        profileImage = svgImg.href.baseVal || '';
      } else if (htmlImg) {
        profileImage = htmlImg.src || '';
      }

      // Get about
      let about = '';
      const aboutSection = document.querySelector('[data-pagelet="ProfileTilesFeed_0"]');
      if (aboutSection) {
        about = aboutSection.textContent?.slice(0, 200) || '';
      }

      return { name, followers, likes, category, profileImage, about };
    });

    // Now get posts to check activity and engagement
    const postsUrl = `https://www.facebook.com/${pageId}`;
    await page.goto(postsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Scroll to load more posts
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 1500));

    const postsData = await page.evaluate(() => {
      const posts: string[] = [];
      const reactions: number[] = [];
      
      // Look for post timestamps
      const timeElements = document.querySelectorAll('a[href*="/posts/"] span, abbr[data-utime], span[id*="jsc"]');
      timeElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && (text.includes('godz') || text.includes('min') || text.includes('dni') || 
            text.includes('temu') || text.includes('wczoraj') || text.match(/\d+\s*(h|d|m|w)/))) {
          posts.push(text);
        }
      });

      // Look for reaction counts on posts
      const allText = document.body.innerText;
      
      // Match patterns like "123", "1,2 tys.", "1.2K", "123 osób", etc.
      const reactionPatterns = [
        /(\d+[,\.]?\d*)\s*tys\.?/gi,  // Polish thousands
        /(\d+[,\.]?\d*)\s*k\b/gi,      // K notation
        /(\d+)\s*(osób|osoby|people|reakcj)/gi,  // People/reactions
        /(\d+)\s*(polubie|like|reaction)/gi
      ];
      
      // Find reaction counts near post areas
      const postAreas = document.querySelectorAll('[data-ad-preview], [role="article"], div[class*="x1yztbdb"]');
      postAreas.forEach(area => {
        const areaText = area.textContent || '';
        
        // Look for numbers that could be reaction counts
        for (const pattern of reactionPatterns) {
          const matches = areaText.matchAll(pattern);
          for (const match of matches) {
            let num = parseFloat(match[1].replace(',', '.'));
            // Convert thousands
            if (match[0].toLowerCase().includes('tys') || match[0].toLowerCase().includes('k')) {
              num *= 1000;
            }
            if (num > 0 && num < 1000000 && reactions.length < 10) {
              reactions.push(Math.round(num));
            }
          }
        }
      });
      
      // Fallback: look for standalone numbers that look like engagement
      if (reactions.length === 0) {
        const standaloneMatches = allText.match(/\b(\d{1,3}(?:[,\.]\d)?)\s*(?:tys|k)\b/gi);
        if (standaloneMatches) {
          standaloneMatches.slice(0, 5).forEach(match => {
            const num = parseFloat(match.replace(/[^\d,\.]/g, '').replace(',', '.'));
            if (num > 0) reactions.push(Math.round(num * 1000));
          });
        }
        
        const smallMatches = allText.match(/\b(\d{2,4})\s*(?:osób|reakcj|polubie)/gi);
        if (smallMatches) {
          smallMatches.slice(0, 5).forEach(match => {
            const num = parseInt(match.replace(/\D/g, ''));
            if (num > 10 && num < 100000) reactions.push(num);
          });
        }
      }

      return { postDates: posts.slice(0, 5), reactions: reactions.slice(0, 10) };
    });

    // Parse last post date
    let daysSinceLastPost: number | null = null;
    let lastPostDate: string | null = null;
    
    if (postsData.postDates.length > 0) {
      const firstPost = postsData.postDates[0].toLowerCase();
      
      if (firstPost.includes('min') || firstPost.includes('godz') || firstPost.includes('h') || firstPost.includes('m')) {
        daysSinceLastPost = 0;
        lastPostDate = 'Dzisiaj';
      } else if (firstPost.includes('wczoraj') || firstPost.includes('1 d')) {
        daysSinceLastPost = 1;
        lastPostDate = 'Wczoraj';
      } else {
        const daysMatch = firstPost.match(/(\d+)\s*(d|dni)/);
        if (daysMatch) {
          daysSinceLastPost = parseInt(daysMatch[1]);
          lastPostDate = `${daysSinceLastPost} dni temu`;
        }
        const weeksMatch = firstPost.match(/(\d+)\s*(w|tyg)/);
        if (weeksMatch) {
          daysSinceLastPost = parseInt(weeksMatch[1]) * 7;
          lastPostDate = `${weeksMatch[1]} tyg. temu`;
        }
      }
    }

    // Calculate engagement rate
    let engagementRate: number | null = null;
    let avgReactions: number | null = null;
    const followers = data.followers || data.likes || 0;
    
    if (postsData.reactions.length > 0 && followers > 0) {
      avgReactions = Math.round(postsData.reactions.reduce((a, b) => a + b, 0) / postsData.reactions.length);
      engagementRate = parseFloat(((avgReactions / followers) * 100).toFixed(2));
    }

    await page.close();

    return {
      name: data.name || pageId,
      followers,
      likes: data.likes || 0,
      category: data.category,
      lastPostDate,
      daysSinceLastPost,
      postsPerWeek: daysSinceLastPost !== null && daysSinceLastPost <= 7 ? Math.round(7 / (daysSinceLastPost || 1)) : 0,
      about: data.about,
      profileImage: data.profileImage,
      engagementRate,
      avgReactions
    };

  } catch (error) {
    await page.close();
    return {
      name: extractPageId(pageUrl),
      followers: 0,
      likes: 0,
      category: '',
      lastPostDate: null,
      daysSinceLastPost: null,
      postsPerWeek: 0,
      about: '',
      profileImage: '',
      engagementRate: null,
      avgReactions: null,
      error: `Nie udało się pobrać danych: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    };
  }
}

export async function scrapeAdLibrary(searchTerm: string): Promise<ScrapedAdsData> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=PL&q=${encodeURIComponent(searchTerm)}&search_type=keyword_unordered&media_type=all`;
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for ads to load
    await new Promise(r => setTimeout(r, 3000));

    // Check if we need to accept cookies
    try {
      const cookieButton = await page.$('button[data-cookiebanner="accept_button"]');
      if (cookieButton) {
        await cookieButton.click();
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch {}

    // Scroll to load more ads
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));

    const adsData = await page.evaluate(() => {
      const ads: Array<{
        id: string;
        pageName: string;
        text: string;
        startedDate: string;
        platforms: string[];
        imageUrl?: string;
      }> = [];

      // Find ad cards - they're in divs with specific structure
      const adContainers = document.querySelectorAll('[class*="x1lliihq"]');
      
      let adCount = 0;
      
      // Count ads more reliably
      const allText = document.body.innerText;
      
      // Look for "Wyświetlane wyniki" or result count
      const resultsMatch = allText.match(/(\d+)\s*(wynik|reklam|ads|results)/i);
      if (resultsMatch) {
        adCount = parseInt(resultsMatch[1]);
      }

      // Also look for "Brak wyników" or "No results"
      const noResults = allText.includes('Brak wyników') || 
                        allText.includes('No results') ||
                        allText.includes('nie znaleziono');

      if (noResults) {
        adCount = 0;
      }

      // Try to find actual ad cards
      const cardSelectors = [
        '[data-visualcompletion="ignore-dynamic"]',
        '[class*="x1cy8zhl"]',
        'div[class*="xh8yej3"]'
      ];

      for (const selector of cardSelectors) {
        const cards = document.querySelectorAll(selector);
        if (cards.length > 0 && adCount === 0) {
          // Count cards that look like ads (have certain structure)
          cards.forEach(card => {
            const text = card.textContent || '';
            if (text.includes('Rozpoczęcie') || text.includes('Started') || 
                text.includes('wyświetlania') || text.includes('running')) {
              adCount++;
              
              // Extract ad info
              const pageName = card.querySelector('a')?.textContent || '';
              const dateMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4})|(\d{4}-\d{2}-\d{2})/);
              
              if (pageName && ads.length < 5) {
                ads.push({
                  id: `ad-${ads.length}`,
                  pageName,
                  text: text.slice(0, 200),
                  startedDate: dateMatch?.[0] || '',
                  platforms: ['facebook']
                });
              }
            }
          });
        }
      }

      // Fallback: count by looking for "Started running" or "Rozpoczęcie wyświetlania" text
      if (adCount === 0) {
        const startedMatches = allText.match(/(Rozpoczęcie wyświetlania|Started running)/gi);
        if (startedMatches) {
          adCount = startedMatches.length;
        }
      }

      return { adsCount: adCount, ads };
    });

    await page.close();

    return {
      hasActiveAds: adsData.adsCount > 0,
      adsCount: adsData.adsCount,
      ads: adsData.ads
    };

  } catch (error) {
    await page.close();
    return {
      hasActiveAds: false,
      adsCount: 0,
      ads: [],
      error: `Błąd scrapowania Ad Library: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    };
  }
}

function extractPageId(url: string): string {
  if (!url.includes('facebook.com') && !url.includes('fb.com')) {
    return url; // Assume it's already a page ID
  }
  
  const patterns = [
    /facebook\.com\/([^\/\?]+)/i,
    /fb\.com\/([^\/\?]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const id = match[1];
      if (!['pages', 'profile.php', 'sharer', 'share', 'login', 'about', 'posts'].includes(id)) {
        return id;
      }
    }
  }
  
  return url;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
