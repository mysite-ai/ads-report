'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface VideoAnalysis {
  id: string;
  url: string;
  thumbnail: string;
  description: string;
  createdAt: string;
  metrics: {
    views: number;
    durationSec: number;
  };
  transcript: string | null;
  transcriptError?: string;
  analysis: {
    summary: string;
    contentType: string;
    sentiment: string;
    engagementPrediction: string;
    topics: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null;
  analysisError?: string;
}

interface OverallInsights {
  topPerformingContent: string[];
  commonThemes: string[];
  audiencePreferences: string[];
  contentGaps: string[];
  strategicRecommendations: string[];
}

interface AnalysisResult {
  profile: {
    name: string;
    url: string;
    platform: string;
    videosFound: number;
    videosWithTranscript: number;
    videosAnalyzed: number;
  };
  videos: VideoAnalysis[];
  overallInsights: OverallInsights | null;
  savedToDatabase: boolean;
}

interface LogEntry {
  id: number;
  type: 'info' | 'success' | 'error' | 'warning' | 'fetch' | 'response' | 'data';
  message: string;
  timestamp: Date;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    positive: 'bg-green-500/20 text-green-400 border-green-500/30',
    negative: 'bg-red-500/20 text-red-400 border-red-500/30',
    neutral: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-mono ${colors[sentiment] || colors.neutral}`}>
      {sentiment}
    </span>
  );
}

function EngagementBadge({ prediction }: { prediction: string }) {
  const colors: Record<string, string> = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-mono ${colors[prediction] || colors.medium}`}>
      {prediction}
    </span>
  );
}

function LogPanel({ logs, isExpanded }: { logs: LogEntry[]; isExpanded: boolean }) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current && isExpanded) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const typeColors: Record<string, string> = {
    info: 'text-cyan-400',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    fetch: 'text-purple-400',
    response: 'text-blue-400',
    data: 'text-zinc-500'
  };

  if (!isExpanded) return null;

  return (
    <div className="bg-black/50 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="max-h-[400px] overflow-y-auto p-4 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-zinc-600">Waiting for data...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3 hover:bg-zinc-900/50">
              <span className="text-zinc-700 flex-shrink-0 w-20">
                {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span className={`${typeColors[log.type]} whitespace-pre-wrap`}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

function DataTable({ videos }: { videos: VideoAnalysis[] }) {
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysis | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Video</th>
              <th className="text-right py-3 px-4 font-medium">Views</th>
              <th className="text-right py-3 px-4 font-medium">Duration</th>
              <th className="text-center py-3 px-4 font-medium">Transcript</th>
              <th className="text-center py-3 px-4 font-medium">Analysis</th>
              <th className="text-center py-3 px-4 font-medium">Sentiment</th>
              <th className="text-center py-3 px-4 font-medium">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video, index) => (
              <tr 
                key={video.id || index} 
                className="border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                onClick={() => setSelectedVideo(selectedVideo?.id === video.id ? null : video)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs flex-shrink-0">
                      📹
                    </div>
                    <div className="min-w-0">
                      <p className="text-zinc-300 truncate max-w-[300px]">
                        {video.description || '(brak opisu)'}
                      </p>
                      <p className="text-zinc-600 text-xs">{video.createdAt?.split('T')[0] || '-'}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono text-cyan-400">
                  {formatNumber(video.metrics.views)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-zinc-400">
                  {video.metrics.durationSec}s
                </td>
                <td className="py-3 px-4 text-center">
                  {video.transcript ? (
                    <span className="text-green-400">✓</span>
                  ) : video.transcriptError ? (
                    <span className="text-red-400" title={video.transcriptError}>✗</span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {video.analysis ? (
                    <span className="text-green-400">✓</span>
                  ) : video.analysisError ? (
                    <span className="text-red-400" title={video.analysisError}>✗</span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {video.analysis ? (
                    <SentimentBadge sentiment={video.analysis.sentiment} />
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {video.analysis ? (
                    <EngagementBadge prediction={video.analysis.engagementPrediction} />
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selectedVideo && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-zinc-200">Detail View</h3>
            <button 
              onClick={() => setSelectedVideo(null)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Transcript</h4>
              <div className="bg-black/30 rounded p-3 text-sm text-zinc-400 max-h-48 overflow-y-auto font-mono">
                {selectedVideo.transcript || selectedVideo.transcriptError || 'No transcript'}
              </div>
            </div>

            {selectedVideo.analysis && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">AI Analysis</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-zinc-500 text-xs">Summary:</span>
                    <p className="text-zinc-300 text-sm">{selectedVideo.analysis.summary}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs">Content Type:</span>
                    <p className="text-cyan-400 text-sm font-mono">{selectedVideo.analysis.contentType}</p>
                  </div>
                  {selectedVideo.analysis.topics?.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Topics:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedVideo.analysis.topics.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedVideo.analysis.strengths?.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Strengths:</span>
                      <ul className="mt-1 space-y-1">
                        {selectedVideo.analysis.strengths.map((s, i) => (
                          <li key={i} className="text-green-400 text-xs">+ {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedVideo.analysis.weaknesses?.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Weaknesses:</span>
                      <ul className="mt-1 space-y-1">
                        {selectedVideo.analysis.weaknesses.map((w, i) => (
                          <li key={i} className="text-red-400 text-xs">- {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyzeContentPage() {
  const [profileUrl, setProfileUrl] = useState('');
  const [videoLimit, setVideoLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState<{ step: string; message: string; current?: number; total?: number } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(true);
  const logIdRef = useRef(0);

  const addLog = (type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      id: logIdRef.current++,
      type,
      message,
      timestamp: new Date()
    };
    setLogs(prev => [...prev, newLog]);
    console.log(`[${type.toUpperCase()}]`, message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    setProgress(null);
    logIdRef.current = 0;

    try {
      const response = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrl, videoLimit })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (currentEvent) {
                case 'log':
                  addLog(data.type, data.message);
                  break;
                case 'progress':
                  setProgress(data);
                  break;
                case 'error':
                  setError(data.message);
                  break;
                case 'result':
                  setResult(data);
                  break;
                case 'done':
                  break;
              }
            } catch (e) {
              console.error('Parse error:', line);
            }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold text-cyan-400 font-mono">CONTENT_ANALYZER</div>
            <span className="text-zinc-700">|</span>
            <span className="text-xs text-zinc-500 font-mono">v2.0</span>
          </div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 font-mono">
            ← BACK
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Input Form */}
        <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-[1fr,150px,150px] gap-4">
              <div>
                <label className="block text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">
                  Profile URL
                </label>
                <input
                  type="url"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder="https://facebook.com/restaurant"
                  className="w-full px-4 py-3 rounded bg-black/50 border border-zinc-800 focus:border-cyan-500 focus:outline-none text-sm font-mono text-zinc-300 placeholder-zinc-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">
                  Video Limit
                </label>
                <select
                  value={videoLimit}
                  onChange={(e) => setVideoLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded bg-black/50 border border-zinc-800 focus:border-cyan-500 focus:outline-none text-sm font-mono text-zinc-300"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-700 text-black font-bold text-sm font-mono uppercase tracking-wider rounded transition-colors"
                >
                  {loading ? 'ANALYZING...' : 'ANALYZE'}
                </button>
              </div>
            </div>

            {progress && (
              <div className="flex items-center gap-4 py-2">
                <div className="animate-pulse w-2 h-2 bg-cyan-400 rounded-full" />
                <span className="text-sm text-cyan-400 font-mono">{progress.message}</span>
                {progress.current && progress.total && (
                  <div className="flex-1 max-w-xs">
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Logs */}
        {(loading || logs.length > 0) && (
          <div className="mb-6">
            <button 
              onClick={() => setLogsExpanded(!logsExpanded)}
              className="flex items-center gap-2 text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2 hover:text-zinc-300"
            >
              <span>{logsExpanded ? '▼' : '▶'}</span>
              <span>SYSTEM LOG</span>
              <span className="text-zinc-700">({logs.length})</span>
            </button>
            <LogPanel logs={logs} isExpanded={logsExpanded} />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm font-mono">[ERROR] {error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Profile</div>
                <div className="text-lg font-bold text-zinc-200">{result.profile.name}</div>
                <div className="text-xs text-cyan-400 font-mono">{result.profile.platform}</div>
              </div>
              <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Videos</div>
                <div className="text-2xl font-bold text-cyan-400 font-mono">{result.profile.videosFound}</div>
              </div>
              <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Transcripts</div>
                <div className="text-2xl font-bold text-green-400 font-mono">{result.profile.videosWithTranscript}</div>
              </div>
              <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Analyzed</div>
                <div className="text-2xl font-bold text-purple-400 font-mono">{result.profile.videosAnalyzed}</div>
              </div>
              <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Total Views</div>
                <div className="text-2xl font-bold text-yellow-400 font-mono">
                  {formatNumber(result.videos.reduce((acc, v) => acc + v.metrics.views, 0))}
                </div>
              </div>
            </div>

            {/* Insights */}
            {result.overallInsights && (
              <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-6">
                <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-4">Strategic Insights</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {result.overallInsights.topPerformingContent?.length > 0 && (
                    <div>
                      <h4 className="text-xs text-green-400 font-mono mb-2">TOP PERFORMING</h4>
                      <ul className="space-y-1">
                        {result.overallInsights.topPerformingContent.map((item, i) => (
                          <li key={i} className="text-sm text-zinc-400 pl-3 border-l border-green-500/30">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.overallInsights.contentGaps?.length > 0 && (
                    <div>
                      <h4 className="text-xs text-red-400 font-mono mb-2">CONTENT GAPS</h4>
                      <ul className="space-y-1">
                        {result.overallInsights.contentGaps.map((item, i) => (
                          <li key={i} className="text-sm text-zinc-400 pl-3 border-l border-red-500/30">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.overallInsights.strategicRecommendations?.length > 0 && (
                    <div className="md:col-span-2">
                      <h4 className="text-xs text-cyan-400 font-mono mb-2">RECOMMENDATIONS</h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        {result.overallInsights.strategicRecommendations.map((rec, i) => (
                          <div key={i} className="bg-black/30 rounded p-3 text-sm text-zinc-400">{rec}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-4">Video Data</h3>
              <DataTable videos={result.videos} />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && logs.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">📊</div>
            <h3 className="text-xl font-mono text-zinc-500 mb-2">NO DATA</h3>
            <p className="text-zinc-600 text-sm font-mono max-w-md mx-auto">
              Enter a Facebook or Instagram profile URL to analyze video content
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
