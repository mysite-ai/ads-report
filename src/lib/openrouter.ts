const API_KEY = process.env.OPENROUTER_API_KEY!;
const BASE_URL = 'https://openrouter.ai/api/v1';

export interface VideoAnalysis {
  summary: string;
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  callToAction: string | null;
  targetAudience: string;
  contentType: string;
  strengths: string[];
  weaknesses: string[];
  engagementPrediction: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface AnalysisResult {
  analysis: VideoAnalysis | null;
  error?: string;
}

export interface BulkAnalysisResult {
  overallInsights: {
    topPerformingContent: string[];
    commonThemes: string[];
    audiencePreferences: string[];
    contentGaps: string[];
    strategicRecommendations: string[];
  };
  error?: string;
}

const ANALYSIS_PROMPT = `Jesteś ekspertem od marketingu restauracji w social media. Przeanalizuj transkrypcję video z profilu restauracji.

Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`):
{
  "summary": "Krótkie streszczenie treści video (1-2 zdania)",
  "topics": ["temat1", "temat2"],
  "sentiment": "positive/negative/neutral",
  "callToAction": "CTA jeśli jest, null jeśli brak",
  "targetAudience": "Do kogo skierowane",
  "contentType": "typ contentu np. przepis, promocja, kulisy, event",
  "strengths": ["mocna strona 1", "mocna strona 2"],
  "weaknesses": ["słaba strona 1"],
  "engagementPrediction": "high/medium/low",
  "recommendations": ["rekomendacja 1", "rekomendacja 2"]
}

Transkrypcja:
`;

const BULK_ANALYSIS_PROMPT = `Jesteś ekspertem od marketingu restauracji w social media. Przeanalizuj zbiorczo wszystkie video z profilu restauracji.

Masz dane o wielu filmach wraz z ich metrykami (wyświetlenia, polubienia, komentarze).

Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`):
{
  "topPerformingContent": ["Opis typu contentu który działa najlepiej 1", "..."],
  "commonThemes": ["Wspólne tematy/motywy w filmach"],
  "audiencePreferences": ["Co lubi publiczność tej restauracji"],
  "contentGaps": ["Czego brakuje w strategii contentowej"],
  "strategicRecommendations": ["Konkretna rekomendacja 1", "..."]
}

Dane o filmach:
`;

export async function analyzeTranscript(transcript: string, videoMetadata?: {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  caption?: string;
}): Promise<AnalysisResult> {
  if (!API_KEY) {
    return { analysis: null, error: 'Brak klucza API OpenRouter' };
  }

  if (!transcript || transcript.trim().length < 10) {
    return { analysis: null, error: 'Transkrypcja jest zbyt krótka do analizy' };
  }

  try {
    let context = transcript;
    if (videoMetadata) {
      context = `[Metryki: ${videoMetadata.viewCount || 0} wyświetleń, ${videoMetadata.likeCount || 0} polubień, ${videoMetadata.commentCount || 0} komentarzy]
[Opis: ${videoMetadata.caption || 'brak'}]

${transcript}`;
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mysite.ai',
        'X-Title': 'MySite Ads Report'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: ANALYSIS_PROMPT + context
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        analysis: null, 
        error: `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}` 
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { analysis: null, error: 'Brak odpowiedzi od modelu' };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { analysis: null, error: 'Nieprawidłowy format odpowiedzi' };
    }

    const analysis = JSON.parse(jsonMatch[0]) as VideoAnalysis;
    return { analysis };
  } catch (error) {
    return {
      analysis: null,
      error: `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function analyzeBulk(videosData: Array<{
  transcript: string;
  caption: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}>): Promise<BulkAnalysisResult> {
  if (!API_KEY) {
    return { 
      overallInsights: {
        topPerformingContent: [],
        commonThemes: [],
        audiencePreferences: [],
        contentGaps: [],
        strategicRecommendations: []
      },
      error: 'Brak klucza API OpenRouter' 
    };
  }

  try {
    const dataString = videosData.map((v, i) => 
      `Video ${i + 1}:
- Wyświetlenia: ${v.viewCount}
- Polubienia: ${v.likeCount}
- Komentarze: ${v.commentCount}
- Opis: ${v.caption || 'brak'}
- Transkrypcja: ${v.transcript.slice(0, 500)}${v.transcript.length > 500 ? '...' : ''}
`
    ).join('\n---\n');

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mysite.ai',
        'X-Title': 'MySite Ads Report'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: BULK_ANALYSIS_PROMPT + dataString
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        overallInsights: {
          topPerformingContent: [],
          commonThemes: [],
          audiencePreferences: [],
          contentGaps: [],
          strategicRecommendations: []
        },
        error: `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}` 
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { 
        overallInsights: {
          topPerformingContent: [],
          commonThemes: [],
          audiencePreferences: [],
          contentGaps: [],
          strategicRecommendations: []
        },
        error: 'Brak odpowiedzi od modelu' 
      };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { 
        overallInsights: {
          topPerformingContent: [],
          commonThemes: [],
          audiencePreferences: [],
          contentGaps: [],
          strategicRecommendations: []
        },
        error: 'Nieprawidłowy format odpowiedzi' 
      };
    }

    const insights = JSON.parse(jsonMatch[0]);
    return { overallInsights: insights };
  } catch (error) {
    return {
      overallInsights: {
        topPerformingContent: [],
        commonThemes: [],
        audiencePreferences: [],
        contentGaps: [],
        strategicRecommendations: []
      },
      error: `Bulk analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
