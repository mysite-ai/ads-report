'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';

interface ReportData {
  page: {
    name: string;
    followers: number;
    likes: number;
    category: string;
    profileImage: string;
    about: string;
    error?: string;
  };
  activity: {
    lastPostDate: string | null;
    daysSinceLastPost: number | null;
    postsPerWeek: number;
    activityScore: number;
  };
  engagement: {
    engagementRate: number | null;
    avgReactions: number | null;
    engagementScore: number;
  };
  ads: {
    hasActiveAds: boolean;
    adsCount: number;
    ads: Array<{
      id: string;
      pageName: string;
      text: string;
      startedDate: string;
      platforms: string[];
    }>;
    adsScore: number;
    error?: string;
  };
  score: {
    overall: number;
    activity: number;
    ads: number;
    engagement: number;
  };
  problems: string[];
  recommendations: string[];
  generatedAt: string;
}

function ScoreCircle({ score, label, size = 'large' }: { score: number; label: string; size?: 'large' | 'small' }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 10) * circumference;
  const sizeClasses = size === 'large' ? 'w-28 h-28' : 'w-16 h-16';
  const textSize = size === 'large' ? 'text-2xl' : 'text-base';
  
  const getColor = (s: number) => {
    if (s >= 7) return '#22c55e';
    if (s >= 4) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses}`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="50%" cy="50%" r="40%" stroke="#e5e5e5" strokeWidth="6" fill="none" />
          <circle
            cx="50%" cy="50%" r="40%"
            stroke={getColor(score)}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center ${textSize} font-semibold text-neutral-900`}>
          {score}/10
        </div>
      </div>
      <span className="mt-2 text-xs text-neutral-500 text-center">{label}</span>
    </div>
  );
}

function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <img src="/logo.svg" alt="mysite.ai" className={className} />
  );
}

function PrintableReport({ data, qrCode }: { data: ReportData; qrCode: string }) {
  const today = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="print-wrapper">
      <div className="a4-page">
        {/* === HEADER === */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <Logo className="h-7" />
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400">{today}</span>
            <span className="text-[11px] font-semibold text-zinc-900 px-2 py-1 bg-zinc-100 rounded">EUROGASTRO 2026</span>
          </div>
        </div>

        {/* === CONTENT === */}
        <div className="flex-1 flex flex-col">
          
          {/* Restaurant Name + Score */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">Raport Social Media</p>
              <h1 className="text-[28px] font-extrabold leading-tight text-[#0a0a0a] mb-1">{data.page.name}</h1>
              {data.page.followers > 0 && (
                <p className="text-[14px] text-zinc-500">{data.page.followers.toLocaleString('pl-PL')} obserwujących na Facebooku</p>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="42%" stroke="#e5e5e5" strokeWidth="6" fill="none" />
                  <circle cx="50%" cy="50%" r="42%"
                    stroke={data.score.overall >= 7 ? '#22c55e' : data.score.overall >= 4 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="6" fill="none" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 - (data.score.overall / 10) * 2 * Math.PI * 34}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[24px] font-bold leading-none">{data.score.overall}</span>
                  <span className="text-[10px] text-zinc-400">/10</span>
                </div>
              </div>
              <p className="text-[10px] font-semibold text-zinc-500 mt-1">OCENA</p>
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-4 gap-2.5 mb-5">
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Aktywność</p>
                <p className="text-[20px] font-bold text-zinc-900">{data.score.activity}<span className="text-[11px] text-zinc-400">/10</span></p>
              </div>
              <p className="text-[10px] text-zinc-500 leading-snug">Regularność publikacji</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Engagement</p>
                <p className="text-[20px] font-bold text-zinc-900">{data.score.engagement}<span className="text-[11px] text-zinc-400">/10</span></p>
              </div>
              <p className="text-[10px] text-zinc-500 leading-snug">
                {data.engagement.engagementRate !== null ? `${data.engagement.engagementRate}% eng. rate` : 'Zaangażowanie'}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Reklamy</p>
                <p className="text-[20px] font-bold text-zinc-900">{data.score.ads}<span className="text-[11px] text-zinc-400">/10</span></p>
              </div>
              <p className="text-[10px] text-zinc-500 leading-snug">Kampanie Meta Ads</p>
            </div>
            <div className={`rounded-xl p-3 ${data.ads.hasActiveAds ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Aktywne</p>
                <p className={`text-[20px] font-bold ${data.ads.hasActiveAds ? 'text-green-600' : 'text-red-600'}`}>{data.ads.adsCount}</p>
              </div>
              <p className="text-[10px] text-zinc-500 leading-snug">{data.ads.hasActiveAds ? 'Reklamy znalezione' : 'Brak widoczności'}</p>
            </div>
          </div>

          {/* Two Columns */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            {/* Activity */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-3">Profil Facebook</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <span className="text-[12px] text-zinc-500">Obserwujących</span>
                  <span className="text-[12px] font-semibold text-zinc-800">{data.page.followers > 0 ? data.page.followers.toLocaleString('pl-PL') : 'Brak danych'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <span className="text-[12px] text-zinc-500">Engagement rate</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${data.score.engagement >= 6 ? 'bg-green-100 text-green-700' : data.score.engagement >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {data.engagement.engagementRate !== null ? `${data.engagement.engagementRate}%` : 'Brak danych'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <span className="text-[12px] text-zinc-500">Regularność postów</span>
                  <span className="text-[12px] font-semibold text-zinc-800">
                    {data.activity.postsPerWeek >= 7 ? 'Codziennie' : data.activity.postsPerWeek >= 3 ? 'Kilka razy/tyg.' : data.activity.postsPerWeek >= 1 ? 'Raz/tydzień' : 'Nieregularnie'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <span className="text-[12px] text-zinc-500">Status aktywności</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${data.score.activity >= 6 ? 'bg-green-100 text-green-700' : data.score.activity >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {data.score.activity >= 6 ? 'Aktywny' : data.score.activity >= 4 ? 'Średnio aktywny' : 'Mało aktywny'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[12px] text-zinc-500">Potencjał wzrostu</span>
                  <span className="text-[12px] font-semibold text-zinc-800">{data.page.followers < 1000 ? 'Wysoki' : data.page.followers < 5000 ? 'Średni' : 'Do utrzymania'}</span>
                </div>
              </div>
            </div>

            {/* Ads */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-3">Reklamy Meta Ads</p>
              <div className={`rounded-xl p-4 mb-3 ${data.ads.hasActiveAds ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-[24px]">{data.ads.hasActiveAds ? '✅' : '❌'}</span>
                  <div>
                    <p className={`text-[14px] font-bold ${data.ads.hasActiveAds ? 'text-green-700' : 'text-red-700'}`}>
                      {data.ads.hasActiveAds ? `${data.ads.adsCount} aktywnych reklam` : 'Brak aktywnych reklam'}
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      {data.ads.hasActiveAds ? 'Restauracja inwestuje w widoczność' : 'Konkurencja z reklamami przejmuje klientów'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                {data.ads.hasActiveAds 
                  ? 'Prowadzenie reklam to dobry znak — warto sprawdzić czy są dobrze zoptymalizowane i czy ROI jest zadowalające.'
                  : 'Bez płatnych reklam restauracja jest niewidoczna dla osób szukających miejsca do jedzenia w okolicy.'}
              </p>
            </div>
          </div>

          {/* Problems */}
          {data.problems.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-2">⚠️ Problemy</p>
              <div className="space-y-1.5">
                {data.problems.slice(0, 4).map((problem, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border-l-3 border-red-400">
                    <span className="text-[11px] font-bold text-red-500 flex-shrink-0">{i + 1}.</span>
                    <p className="text-[12px] text-zinc-700 leading-snug">{problem}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-2">💡 Rekomendacje</p>
            <div className="space-y-1.5">
              {data.recommendations.slice(0, 4).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-green-50 rounded-lg border-l-3 border-green-400">
                  <span className="text-green-600 text-[11px] flex-shrink-0">→</span>
                  <p className="text-[12px] text-zinc-700 leading-snug">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === CTA FOOTER === */}
        <div className="rounded-xl bg-[#0a0a0a] text-white p-5 flex items-center justify-between flex-shrink-0 mt-auto">
          <div>
            <Logo className="h-6 brightness-0 invert mb-2" />
            <p className="text-[12px] text-zinc-400">Reklamy i social media dla restauracji</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Kod rabatowy</p>
              <div className="bg-white text-[#0a0a0a] px-4 py-2 rounded-lg">
                <p className="text-[18px] font-black tracking-wider">EUROGASTRO26</p>
              </div>
              <p className="text-green-400 text-[11px] font-semibold mt-1">🎁 Miesiąc za darmo</p>
            </div>
            {qrCode && (
              <div className="bg-white p-1.5 rounded-lg">
                <img src={qrCode} alt="QR" className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>

        {/* === PAGE FOOTER === */}
        <div className="mt-3 pt-2 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] text-zinc-400">Raport wygenerowany przez mysite.ai</span>
          <span className="text-[10px] text-zinc-400">www.mysite.ai • {today}</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [facebookUrl, setFacebookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [progress, setProgress] = useState('');

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProgress('Pobieram dane z Facebooka...');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facebookUrl })
      });

      setProgress('Sprawdzam reklamy w Meta Ad Library...');

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Wystąpił błąd');
      }

      setProgress('Generuję raport...');

      setReportData(result.data);

      const qr = await QRCode.toDataURL('https://mysite.ai?ref=eurogastro26', {
        width: 150,
        margin: 0,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCode(qr);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handlePrint = () => window.print();
  
  const resetForm = () => {
    setReportData(null);
    setFacebookUrl('');
    setQrCode('');
  };

  if (reportData) {
    return (
      <>
        <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
          <button onClick={handlePrint} className="bg-neutral-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-neutral-800 transition shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Drukuj
          </button>
          <button onClick={resetForm} className="bg-white text-neutral-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-neutral-100 transition shadow-lg border border-neutral-200">
            Nowy raport
          </button>
        </div>
        <PrintableReport data={reportData} qrCode={qrCode} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Logo className="h-8 mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">Raport Social Media dla restauracji</p>
          <div className="inline-block mt-2 px-3 py-1 bg-neutral-900 text-white text-xs font-medium rounded-full">
            Eurogastro 2026
          </div>
        </div>

        <form onSubmit={generateReport} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Strona Facebook restauracji
            </label>
            <input
              type="text"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="np. facebook.com/restauracja"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition text-sm"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white py-3.5 rounded-xl font-medium hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">{progress || 'Analizuję...'}</span>
              </>
            ) : (
              <span>Generuj raport</span>
            )}
          </button>
        </form>

        <p className="text-center text-neutral-400 text-xs mt-6">
          Automatyczna analiza profilu i reklam • ~30 sekund
        </p>
      </div>
    </div>
  );
}
