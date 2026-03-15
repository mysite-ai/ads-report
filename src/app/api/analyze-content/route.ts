import { NextRequest } from 'next/server';
import { fetchAllVideos, getTranscript, detectPlatform, VideoData } from '@/lib/video-fetcher';
import { analyzeTranscript, analyzeBulk } from '@/lib/openrouter';
import { 
  upsertRestaurant, 
  insertVideo, 
  insertTranscript, 
  insertAnalysis,
  insertBulkAnalysis 
} from '@/lib/supabase';

export const maxDuration = 300;

interface ProcessedVideo {
  video: VideoData;
  transcript: string;
  analysis: any;
  transcriptError?: string;
  analysisError?: string;
}

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    }
  });

  const send = (event: string, data: any) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  const close = () => {
    controller.close();
  };

  return { stream, send, close };
}

export async function POST(request: NextRequest) {
  const { stream, send, close } = createSSEStream();

  const processAsync = async () => {
    try {
      const body = await request.json();
      const { profileUrl, videoLimit = 10 } = body;

      send('log', { type: 'info', message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` });
      send('log', { type: 'info', message: `🚀 START ANALIZY` });
      send('log', { type: 'info', message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` });
      send('log', { type: 'data', message: `URL: ${profileUrl}` });
      send('log', { type: 'data', message: `Limit: ${videoLimit} filmów` });

      if (!profileUrl) {
        send('error', { message: 'URL profilu jest wymagany' });
        send('done', { success: false });
        close();
        return;
      }

      const platform = detectPlatform(profileUrl);
      send('log', { type: 'info', message: `🔍 Platforma: ${platform.toUpperCase()}` });

      if (platform === 'unknown') {
        send('error', { message: 'Nierozpoznana platforma' });
        send('done', { success: false });
        close();
        return;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 1: FETCH VIDEOS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      send('log', { type: 'info', message: `\n📹 STEP 1: POBIERANIE FILMÓW` });
      send('progress', { step: 'videos', message: '📹 Pobieranie listy filmów z API...' });

      const videosResult = await fetchAllVideos(profileUrl, videoLimit);

      if (videosResult.error) {
        send('log', { type: 'error', message: `❌ API Error: ${videosResult.error}` });
      }

      if (videosResult.rawResponse) {
        send('log', { type: 'data', message: `📦 Raw API Response (first 500 chars):` });
        send('log', { type: 'data', message: JSON.stringify(videosResult.rawResponse, null, 2).slice(0, 500) });
      }

      send('log', { type: 'success', message: `✅ Znaleziono: ${videosResult.videos.length} filmów` });

      if (videosResult.videos.length === 0) {
        send('error', { message: videosResult.error || 'Nie znaleziono filmów' });
        send('done', { success: false });
        close();
        return;
      }

      // Log each video
      send('log', { type: 'info', message: `\n📊 LISTA FILMÓW:` });
      videosResult.videos.forEach((v, i) => {
        send('log', { type: 'data', message: `[${i + 1}] 👁️ ${v.viewCount.toLocaleString().padStart(8)} | ${v.url}` });
      });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 2: SAVE TO DATABASE
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      send('log', { type: 'info', message: `\n💾 STEP 2: ZAPIS DO BAZY` });
      send('progress', { step: 'database', message: '💾 Zapisywanie profilu do bazy...' });
      
      const restaurantResult = await upsertRestaurant({
        name: videosResult.profileName || 'Unknown',
        platform,
        profile_url: profileUrl
      });

      const restaurantId = restaurantResult.data?.id;
      
      if (restaurantId) {
        send('log', { type: 'success', message: `✅ Restauracja zapisana: ${restaurantId}` });
      } else {
        send('log', { type: 'warning', message: `⚠️ Baza niedostępna: ${restaurantResult.error}` });
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 3: TRANSCRIPTS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      send('log', { type: 'info', message: `\n🎙️ STEP 3: TRANSKRYPCJE (ScrapeCreators API)` });

      const processedVideos: ProcessedVideo[] = [];
      const videosForBulkAnalysis: Array<{
        transcript: string;
        caption: string;
        viewCount: number;
        likeCount: number;
        commentCount: number;
      }> = [];

      for (let i = 0; i < videosResult.videos.length; i++) {
        const video = videosResult.videos[i];
        
        send('progress', { 
          step: 'transcribe', 
          message: `🎙️ Transkrypcja ${i + 1}/${videosResult.videos.length}...`,
          current: i + 1,
          total: videosResult.videos.length
        });

        send('log', { type: 'info', message: `\n━━━ FILM ${i + 1}/${videosResult.videos.length} ━━━` });
        send('log', { type: 'data', message: `🔗 ${video.url}` });
        send('log', { type: 'data', message: `👁️ ${video.viewCount.toLocaleString()} views | ⏱️ ${Math.round(video.playTimeMs / 1000)}s` });
        send('log', { type: 'data', message: `📝 "${video.description.slice(0, 80) || '(brak)'}..."` });

        const processedVideo: ProcessedVideo = {
          video,
          transcript: '',
          analysis: null
        };

        // Get transcript from ScrapeCreators
        send('log', { type: 'fetch', message: `🌐 Transkrypcja: ${video.url}` });
        const transcriptResult = await getTranscript(video.url, video.platform);

        if (transcriptResult.error) {
          send('log', { type: 'error', message: `❌ Transkrypcja: ${transcriptResult.error}` });
          processedVideo.transcriptError = transcriptResult.error;
        } else if (transcriptResult.transcript) {
          send('log', { type: 'success', message: `✅ Transkrypcja: ${transcriptResult.transcript.length} znaków` });
          send('log', { type: 'data', message: `📜 "${transcriptResult.transcript.slice(0, 150)}..."` });
          processedVideo.transcript = transcriptResult.transcript;
        } else {
          send('log', { type: 'warning', message: `⚠️ Pusta transkrypcja (video może nie mieć mowy)` });
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 4: AI ANALYSIS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (processedVideo.transcript && processedVideo.transcript.length > 20) {
          send('progress', { 
            step: 'analyze', 
            message: `🤖 AI analiza ${i + 1}/${videosResult.videos.length}...`,
            current: i + 1,
            total: videosResult.videos.length
          });

          send('log', { type: 'fetch', message: `🤖 Wysyłam do OpenRouter (Claude)...` });
          
          const analysisResult = await analyzeTranscript(processedVideo.transcript, {
            viewCount: video.viewCount,
            likeCount: 0,
            commentCount: 0,
            caption: video.description
          });

          if (analysisResult.analysis) {
            send('log', { type: 'success', message: `✅ Analiza AI OK` });
            send('log', { type: 'data', message: `   📊 Sentiment: ${analysisResult.analysis.sentiment}` });
            send('log', { type: 'data', message: `   📊 Engagement: ${analysisResult.analysis.engagementPrediction}` });
            send('log', { type: 'data', message: `   📊 Typ: ${analysisResult.analysis.contentType}` });
            send('log', { type: 'data', message: `   📊 Summary: ${analysisResult.analysis.summary}` });
            processedVideo.analysis = analysisResult.analysis;
          } else {
            send('log', { type: 'error', message: `❌ Analiza: ${analysisResult.error}` });
            processedVideo.analysisError = analysisResult.error;
          }

          videosForBulkAnalysis.push({
            transcript: processedVideo.transcript,
            caption: video.description,
            viewCount: video.viewCount,
            likeCount: 0,
            commentCount: 0
          });
        }

        // Save to database
        if (restaurantId) {
          const videoResult = await insertVideo({
            restaurant_id: restaurantId,
            external_id: video.id,
            platform: video.platform,
            url: video.url,
            video_url: video.videoUrl,
            thumbnail: video.thumbnail,
            caption: video.description,
            timestamp: video.createdAt,
            view_count: video.viewCount,
            like_count: 0,
            comment_count: 0,
            share_count: 0
          });

          if (videoResult.data?.id) {
            if (processedVideo.transcript) {
              await insertTranscript({
                video_id: videoResult.data.id,
                text: processedVideo.transcript
              });
            }

            if (processedVideo.analysis) {
              await insertAnalysis({
                video_id: videoResult.data.id,
                summary: processedVideo.analysis.summary,
                topics: processedVideo.analysis.topics,
                sentiment: processedVideo.analysis.sentiment,
                call_to_action: processedVideo.analysis.callToAction,
                target_audience: processedVideo.analysis.targetAudience,
                content_type: processedVideo.analysis.contentType,
                strengths: processedVideo.analysis.strengths,
                weaknesses: processedVideo.analysis.weaknesses,
                engagement_prediction: processedVideo.analysis.engagementPrediction,
                recommendations: processedVideo.analysis.recommendations
              });
            }
          }
        }

        processedVideos.push(processedVideo);

        send('videoProcessed', {
          index: i,
          id: video.id,
          views: video.viewCount,
          hasTranscript: !!processedVideo.transcript,
          hasAnalysis: !!processedVideo.analysis
        });
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 5: BULK ANALYSIS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let bulkAnalysis = null;
      if (videosForBulkAnalysis.length >= 2) {
        send('log', { type: 'info', message: `\n🧠 STEP 5: ANALIZA ZBIORCZA` });
        send('progress', { step: 'bulk', message: '🧠 Analiza strategiczna wszystkich filmów...' });

        const bulkResult = await analyzeBulk(videosForBulkAnalysis);
        
        if (bulkResult.overallInsights) {
          send('log', { type: 'success', message: `✅ Analiza zbiorcza OK` });
          bulkAnalysis = bulkResult.overallInsights;

          if (restaurantId) {
            await insertBulkAnalysis({
              restaurant_id: restaurantId,
              top_performing_content: bulkAnalysis.topPerformingContent,
              common_themes: bulkAnalysis.commonThemes,
              audience_preferences: bulkAnalysis.audiencePreferences,
              content_gaps: bulkAnalysis.contentGaps,
              strategic_recommendations: bulkAnalysis.strategicRecommendations,
              videos_analyzed: videosForBulkAnalysis.length
            });
          }
        } else {
          send('log', { type: 'error', message: `❌ Bulk analysis: ${bulkResult.error}` });
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUMMARY
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      send('log', { type: 'info', message: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` });
      send('log', { type: 'success', message: `🎉 ZAKOŃCZONO` });
      send('log', { type: 'data', message: `   📹 Filmów: ${videosResult.videos.length}` });
      send('log', { type: 'data', message: `   🎙️ Transkrypcji: ${processedVideos.filter(v => v.transcript).length}` });
      send('log', { type: 'data', message: `   🤖 Analiz AI: ${processedVideos.filter(v => v.analysis).length}` });
      send('log', { type: 'data', message: `   💾 Baza: ${restaurantId ? 'ZAPISANO' : 'NIEDOSTĘPNA'}` });
      send('log', { type: 'info', message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` });

      // Send final result
      send('result', {
        profile: {
          name: videosResult.profileName,
          url: profileUrl,
          platform,
          videosFound: videosResult.videos.length,
          videosWithTranscript: processedVideos.filter(v => v.transcript).length,
          videosAnalyzed: processedVideos.filter(v => v.analysis).length
        },
        videos: processedVideos.map(pv => ({
          id: pv.video.id,
          url: pv.video.url,
          thumbnail: pv.video.thumbnail,
          description: pv.video.description,
          createdAt: pv.video.createdAt,
          metrics: {
            views: pv.video.viewCount,
            durationSec: Math.round(pv.video.playTimeMs / 1000)
          },
          transcript: pv.transcript || null,
          transcriptError: pv.transcriptError,
          analysis: pv.analysis ? {
            summary: pv.analysis.summary,
            contentType: pv.analysis.contentType,
            sentiment: pv.analysis.sentiment,
            engagementPrediction: pv.analysis.engagementPrediction,
            topics: pv.analysis.topics,
            strengths: pv.analysis.strengths,
            weaknesses: pv.analysis.weaknesses,
            recommendations: pv.analysis.recommendations
          } : null,
          analysisError: pv.analysisError
        })),
        overallInsights: bulkAnalysis,
        savedToDatabase: !!restaurantId
      });

      send('done', { success: true });

    } catch (error) {
      console.error('Content analysis error:', error);
      send('log', { type: 'error', message: `💥 FATAL ERROR: ${error instanceof Error ? error.message : 'Unknown'}` });
      send('error', { message: error instanceof Error ? error.message : 'Nieznany błąd' });
      send('done', { success: false });
    } finally {
      close();
    }
  };

  processAsync();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
