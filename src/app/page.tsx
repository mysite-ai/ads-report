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
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <Logo className="h-7" />
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-zinc-600">{today}</span>
            <span className="text-[12px] font-bold text-black px-2 py-0.5 bg-zinc-100 rounded">EUROGASTRO 2026</span>
          </div>
        </div>

        {/* === CONTENT === */}
        <div className="flex-1 flex flex-col">
          
          {/* Restaurant Name + Score */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-600 font-bold mb-1">Raport Social Media</p>
              <h1 className="text-[26px] font-black leading-tight text-black mb-0.5">{data.page.name}</h1>
              {data.page.followers > 0 && (
                <p className="text-[14px] text-zinc-600 font-medium">{data.page.followers.toLocaleString('pl-PL')} obserwujących na Facebooku</p>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="42%" stroke="#d4d4d8" strokeWidth="5" fill="none" />
                  <circle cx="50%" cy="50%" r="42%"
                    stroke={data.score.overall >= 7 ? '#16a34a' : data.score.overall >= 4 ? '#d97706' : '#dc2626'}
                    strokeWidth="5" fill="none" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 27}
                    strokeDashoffset={2 * Math.PI * 27 - (data.score.overall / 10) * 2 * Math.PI * 27}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-black leading-none text-black">{data.score.overall}</span>
                  <span className="text-[10px] text-zinc-600 font-semibold">/10</span>
                </div>
              </div>
              <p className="text-[10px] font-bold text-zinc-600 mt-0.5">OCENA</p>
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="rounded-lg bg-zinc-100 p-2 border border-zinc-200">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-700 font-bold">Aktywność</p>
                <p className="text-[18px] font-black text-black">{data.score.activity}<span className="text-[10px] text-zinc-600 font-bold">/10</span></p>
              </div>
              <p className="text-[10px] text-zinc-700 font-medium">Regularność publikacji</p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-2 border border-zinc-200">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-700 font-bold">Engagement</p>
                <p className="text-[18px] font-black text-black">{data.score.engagement}<span className="text-[10px] text-zinc-600 font-bold">/10</span></p>
              </div>
              <p className="text-[10px] text-zinc-700 font-medium">
                {data.engagement.engagementRate !== null ? `${data.engagement.engagementRate}% eng. rate` : 'Zaangażowanie'}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-2 border border-zinc-200">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-700 font-bold">Reklamy</p>
                <p className="text-[18px] font-black text-black">{data.score.ads}<span className="text-[10px] text-zinc-600 font-bold">/10</span></p>
              </div>
              <p className="text-[10px] text-zinc-700 font-medium">Kampanie Meta Ads</p>
            </div>
            <div className={`rounded-lg p-2 border-2 ${data.ads.hasActiveAds ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-700 font-bold">Aktywne</p>
                <p className={`text-[18px] font-black ${data.ads.hasActiveAds ? 'text-green-700' : 'text-red-700'}`}>{data.ads.adsCount}</p>
              </div>
              <p className="text-[10px] text-zinc-700 font-medium">{data.ads.hasActiveAds ? 'Reklamy znalezione' : 'Brak widoczności'}</p>
            </div>
          </div>

          {/* Two Columns */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* Activity */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-700 font-bold mb-2">Profil Facebook</p>
              <div className="space-y-0">
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                  <span className="text-[12px] text-zinc-700 font-medium">Obserwujących</span>
                  <span className="text-[12px] font-bold text-black">{data.page.followers > 0 ? data.page.followers.toLocaleString('pl-PL') : 'Brak danych'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                  <span className="text-[12px] text-zinc-700 font-medium">Engagement rate</span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${data.score.engagement >= 6 ? 'bg-green-200 text-green-800' : data.score.engagement >= 4 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>
                    {data.engagement.engagementRate !== null ? `${data.engagement.engagementRate}%` : 'Brak danych'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                  <span className="text-[12px] text-zinc-700 font-medium">Regularność postów</span>
                  <span className="text-[12px] font-bold text-black">
                    {data.activity.postsPerWeek >= 7 ? 'Codziennie' : data.activity.postsPerWeek >= 3 ? 'Kilka razy/tyg.' : data.activity.postsPerWeek >= 1 ? 'Raz/tydzień' : 'Nieregularnie'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                  <span className="text-[12px] text-zinc-700 font-medium">Status aktywności</span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${data.score.activity >= 6 ? 'bg-green-200 text-green-800' : data.score.activity >= 4 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>
                    {data.score.activity >= 6 ? 'Aktywny' : data.score.activity >= 4 ? 'Średnio aktywny' : 'Mało aktywny'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[12px] text-zinc-700 font-medium">Potencjał wzrostu</span>
                  <span className="text-[12px] font-bold text-black">{data.page.followers < 1000 ? 'Wysoki' : data.page.followers < 5000 ? 'Średni' : 'Do utrzymania'}</span>
                </div>
              </div>
            </div>

            {/* Ads */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-700 font-bold mb-2">Reklamy Meta Ads</p>
              <div className={`rounded-lg p-3 mb-2 border-2 ${data.ads.hasActiveAds ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{data.ads.hasActiveAds ? '✓' : '✗'}</span>
                  <div>
                    <p className={`text-[13px] font-black ${data.ads.hasActiveAds ? 'text-green-800' : 'text-red-800'}`}>
                      {data.ads.hasActiveAds ? `${data.ads.adsCount} aktywnych reklam` : 'Brak aktywnych reklam'}
                    </p>
                    <p className="text-[11px] text-zinc-700 font-medium">
                      {data.ads.hasActiveAds ? 'Restauracja inwestuje w widoczność' : 'Konkurencja z reklamami przejmuje klientów'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-zinc-700 leading-snug font-medium">
                {data.ads.hasActiveAds 
                  ? 'Prowadzenie reklam to dobry znak — warto sprawdzić czy są zoptymalizowane.'
                  : 'Bez reklam restauracja jest niewidoczna dla nowych klientów.'}
              </p>
            </div>
          </div>

          {/* Problems */}
          {data.problems.length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-700 font-bold mb-1.5">PROBLEMY</p>
              <div className="space-y-1">
                {data.problems.slice(0, 3).map((problem, i) => (
                  <div key={i} className="flex items-start gap-1.5 p-2 bg-red-100 rounded border-l-3 border-red-500">
                    <span className="text-[12px] font-black text-red-700 flex-shrink-0">{i + 1}.</span>
                    <p className="text-[12px] text-zinc-800 leading-snug font-medium">{problem}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="mb-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-700 font-bold mb-1.5">REKOMENDACJE</p>
            <div className="space-y-1">
              {data.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="flex items-start gap-1.5 p-2 bg-yellow-100 rounded border-l-3 border-yellow-500">
                  <span className="text-yellow-700 text-[12px] font-black flex-shrink-0">→</span>
                  <p className="text-[12px] text-zinc-800 leading-snug font-medium">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === CTA FOOTER === */}
        <div className="rounded-lg bg-black text-white p-3 flex items-center justify-between flex-shrink-0 mt-auto">
          <div>
            <Logo className="h-6 brightness-0 invert mb-1" />
            <p className="text-[12px] text-zinc-300 font-medium">Reklamy i social media dla restauracji</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-0.5">Kod rabatowy</p>
              <div className="bg-white text-black px-3 py-1.5 rounded">
                <p className="text-[18px] font-black tracking-wider">EUROGASTRO26</p>
              </div>
              <p className="text-green-400 text-[11px] font-bold mt-0.5">Miesiąc za darmo!</p>
            </div>
            {qrCode && (
              <div className="bg-white p-1.5 rounded">
                <img src={qrCode} alt="QR" style={{ width: '56px', height: '56px' }} />
              </div>
            )}
          </div>
        </div>

        {/* === PAGE FOOTER === */}
        <div className="mt-2 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] text-zinc-500 font-medium">Raport wygenerowany przez mysite.ai</span>
          <span className="text-[10px] text-zinc-500 font-medium">www.mysite.ai • {today}</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    followers: '',
    lastPostDays: '7',
    hasAds: 'no',
    adsCount: '0'
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [qrCode, setQrCode] = useState('');

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const followers = parseInt(formData.followers) || 0;
    const daysSinceLastPost = parseInt(formData.lastPostDays) || 30;
    const hasAds = formData.hasAds === 'yes';
    const adsCount = hasAds ? parseInt(formData.adsCount) || 1 : 0;

    // Calculate scores
    let activityScore = 5;
    if (daysSinceLastPost <= 1) activityScore = 8;
    else if (daysSinceLastPost <= 3) activityScore = 7;
    else if (daysSinceLastPost <= 7) activityScore = 6;
    else if (daysSinceLastPost > 30) activityScore = 2;
    else if (daysSinceLastPost > 14) activityScore = 3;

    if (followers > 10000) activityScore = Math.min(10, activityScore + 1);
    else if (followers < 500) activityScore = Math.max(1, activityScore - 1);

    let adsScore = hasAds ? 6 : 2;
    if (adsCount >= 5) adsScore = 9;
    else if (adsCount >= 3) adsScore = 7;

    const engagementScore = 5; // neutral - nie możemy zmierzyć ręcznie
    const overallScore = Math.round((activityScore + adsScore + engagementScore) / 3);

    // Generate problems and recommendations
    const problems: string[] = [];
    const recommendations: string[] = [];

    if (daysSinceLastPost > 14) {
      problems.push(`Ostatni post ${daysSinceLastPost} dni temu - klienci mogą myśleć że restauracja jest zamknięta`);
      recommendations.push('Regularne posty (min. 2-3x w tygodniu) budują zaufanie');
    } else if (daysSinceLastPost > 7) {
      problems.push('Posty rzadziej niż raz w tygodniu - algorytm obniża zasięgi');
    }

    if (followers < 1000) {
      problems.push('Mała liczba obserwujących - ograniczony zasięg organiczny');
      recommendations.push('Kampanie na zwiększenie obserwujących pomogą budować społeczność');
    }

    if (!hasAds) {
      problems.push('Brak aktywnych reklam - restauracja niewidoczna dla nowych klientów');
      recommendations.push('Kampanie reklamowe zwiększą liczbę zamówień i rezerwacji');
      recommendations.push('Konkurencja prawdopodobnie już prowadzi płatne kampanie');
    }

    if (recommendations.length < 3) {
      recommendations.push('Profesjonalne zdjęcia jedzenia zwiększają zaangażowanie');
      recommendations.push('Stories i Reels mają największe zasięgi organiczne');
    }

    const data: ReportData = {
      page: {
        name: formData.name,
        followers,
        likes: followers,
        category: 'Restauracja',
        profileImage: '',
        about: ''
      },
      activity: {
        lastPostDate: daysSinceLastPost <= 1 ? 'Dzisiaj' : `${daysSinceLastPost} dni temu`,
        daysSinceLastPost,
        postsPerWeek: daysSinceLastPost <= 7 ? Math.round(7 / daysSinceLastPost) : 0,
        activityScore
      },
      engagement: {
        engagementRate: null,
        avgReactions: null,
        engagementScore
      },
      ads: {
        hasActiveAds: hasAds,
        adsCount,
        ads: [],
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
    };

    setReportData(data);

    const qr = await QRCode.toDataURL('https://mysite.ai?ref=eurogastro26', {
      width: 150,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    });
    setQrCode(qr);
    setLoading(false);
  };

  const handlePrint = () => window.print();
  
  const resetForm = () => {
    setReportData(null);
    setFormData({ name: '', followers: '', lastPostDays: '7', hasAds: 'no', adsCount: '0' });
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
        <div className="text-center mb-6">
          <Logo className="h-8 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Raport Social Media dla restauracji</p>
          <div className="inline-block mt-2 px-3 py-1 bg-neutral-900 text-white text-xs font-medium rounded-full">
            Eurogastro 2026
          </div>
        </div>

        <form onSubmit={generateReport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nazwa restauracji
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="np. Pizzeria Roma"
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Obserwujących na FB
            </label>
            <input
              type="number"
              value={formData.followers}
              onChange={(e) => setFormData({...formData, followers: e.target.value})}
              placeholder="np. 1500"
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Ostatni post
            </label>
            <select
              value={formData.lastPostDays}
              onChange={(e) => setFormData({...formData, lastPostDays: e.target.value})}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition text-sm"
            >
              <option value="1">Dziś / wczoraj</option>
              <option value="3">2-3 dni temu</option>
              <option value="7">Tydzień temu</option>
              <option value="14">2 tygodnie temu</option>
              <option value="30">Miesiąc temu</option>
              <option value="60">Ponad miesiąc temu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Aktywne reklamy Meta?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasAds"
                  value="no"
                  checked={formData.hasAds === 'no'}
                  onChange={(e) => setFormData({...formData, hasAds: e.target.value, adsCount: '0'})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Nie</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasAds"
                  value="yes"
                  checked={formData.hasAds === 'yes'}
                  onChange={(e) => setFormData({...formData, hasAds: e.target.value, adsCount: '1'})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Tak</span>
              </label>
            </div>
          </div>

          {formData.hasAds === 'yes' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Ile reklam?
              </label>
              <input
                type="number"
                value={formData.adsCount}
                onChange={(e) => setFormData({...formData, adsCount: e.target.value})}
                min="1"
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Generuję...' : 'Generuj raport'}
          </button>
        </form>

        <p className="text-center text-neutral-400 text-xs mt-4">
          Sprawdź reklamy na: <a href="https://www.facebook.com/ads/library" target="_blank" className="underline">fb.com/ads/library</a>
        </p>
      </div>
    </div>
  );
}
