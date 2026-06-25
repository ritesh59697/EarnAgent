'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Match {
  id: string
  match_score: number
  match_reason: string
  draft: string
  status: string
  created_at: string
  listings: {
    title: string
    sponsor_name: string
    reward_amount: number
    reward_token: string
    type: string
    url: string
    skills: string[]
  }
}

interface UserProfile {
  id: string
  name: string
  bio: string
  skills: string[]
  experience_level: string
  telegram_id: string
}

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([])
  const [selected, setSelected] = useState<Match | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'bounty' | 'grant'>('all')

  useEffect(() => {
    async function load() {
      // Load Matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*, listings(*)')
        .neq('status', 'dismissed')
        .order('match_score', { ascending: false })
        .limit(30)

      const activeMatches = matchesData || []
      setMatches(activeMatches)
      if (activeMatches.length) setSelected(activeMatches[0])

      // Load Profile
      const { data: profiles } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      if (profiles && profiles.length > 0) {
        setProfile(profiles[0])
      }

      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: string) {
    await supabase.from('matches').update({ status }).eq('id', id)
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status } : null)
    }
  }

  function copyDraft() {
    if (!selected?.draft) return
    navigator.clipboard.writeText(selected.draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Filter listings based on search and tab selections
  const filteredMatches = matches.filter(match => {
    const listing = match.listings
    if (!listing) return false
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType =
      filterType === 'all' ||
      listing.type.toLowerCase() === filterType.toLowerCase()

    return matchesSearch && matchesType
  })

  // Calculation of Stats
  const totalMatches = matches.length
  const appliedCount = matches.filter(m => m.status === 'applied').length
  const averageScore = matches.length
    ? (matches.reduce((acc, m) => acc + m.match_score, 0) / matches.length).toFixed(1)
    : '0.0'

  if (loading) return (
    <div className="min-h-screen bg-[#f4f2ed] flex items-center justify-center font-mono">
      <div className="border-3 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-sm text-center">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-purple-600 animate-spin mx-auto mb-4" />
        <p className="font-bold text-slate-900 uppercase">SYNCING_OPPORTUNITIES.EXE</p>
        <p className="text-xs text-slate-500 mt-2">Connecting to Superteam Earn Database...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-slate-900 flex flex-col font-sans antialiased selection:bg-[#ffe600] selection:text-slate-900">
      
      {/* Brutalist Header */}
      <header className="bg-white border-b-3 border-slate-900 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 border-3 border-slate-900 bg-[#ffe600] flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight leading-none text-slate-900">Earn Agent</h1>
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase mt-1 block">AI_SUPERTEAM_MATCHER_V1.0</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#a3e635] border-2 border-slate-900 rounded-none px-3.5 py-1 text-xs font-black text-slate-900 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-900"></span>
            </span>
            Scraper Active
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-col flex-1 p-6 sm:p-8 gap-8 max-w-7xl mx-auto w-full min-h-0">
        
        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#ffe600] border-3 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black tracking-widest text-slate-800 uppercase">Matches Found</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black">{totalMatches}</span>
              <span className="text-xs font-mono font-bold text-slate-700">LISTINGS</span>
            </div>
          </div>
          <div className="bg-[#a3e635] border-3 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black tracking-widest text-slate-800 uppercase">Applied</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black">{appliedCount}</span>
              <span className="text-xs font-mono font-bold text-slate-700">SUBMITTED</span>
            </div>
          </div>
          <div className="bg-[#00f0ff] border-3 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black tracking-widest text-slate-800 uppercase">Avg Match Score</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black">{averageScore}</span>
              <span className="text-xs font-mono font-bold text-slate-700">/ 10</span>
            </div>
          </div>
          <div className="bg-[#ff7a00] border-3 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-slate-900 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black tracking-widest text-slate-900 uppercase">Sync Status</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-lg font-black uppercase">BOT_ONLINE</span>
            </div>
          </div>
        </section>

        {/* Brutalist Split View */}
        <div className="flex flex-col lg:flex-row flex-1 gap-8 min-h-0">
          
          {/* Left Column: Filter + List */}
          <aside className="w-full lg:w-96 flex flex-col gap-6 flex-shrink-0 min-h-0">
            
            {/* Search and Filters */}
            <div className="bg-white border-3 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH_SKILLS_OR_TITLE..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f4f2ed] border-3 border-slate-900 outline-none px-4 py-2.5 pl-10 text-xs font-mono placeholder-slate-500 font-bold focus:bg-white transition-colors"
                />
                <svg className="w-4 h-4 text-slate-700 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 border-2 border-slate-900">
                <button
                  onClick={() => setFilterType('all')}
                  className={`py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all ${filterType === 'all' ? 'bg-[#ffe600] text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setFilterType('bounty')}
                  className={`py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all ${filterType === 'bounty' ? 'bg-[#ffe600] text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  BOUNTIES
                </button>
                <button
                  onClick={() => setFilterType('grant')}
                  className={`py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all ${filterType === 'grant' ? 'bg-[#ffe600] text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  GRANTS
                </button>
              </div>
            </div>

            {/* Profile sync card */}
            {profile && (
              <div className="bg-white border-3 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 font-mono">
                <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3">
                  <div className="w-10 h-10 border-3 border-slate-900 bg-[#ff7a00] flex items-center justify-center text-slate-900 text-lg font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {profile.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-900">{profile.name}</h3>
                    <span className="text-[9px] font-bold text-slate-500">LEVEL: {profile.experience_level.toUpperCase()}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-700 leading-relaxed font-bold bg-[#f4f2ed] border-2 border-slate-900 p-2.5">
                  "{profile.bio}"
                </p>

                <div className="flex flex-wrap gap-1">
                  {profile.skills?.map(skill => (
                    <span key={skill} className="text-[9px] bg-[#00f0ff] border-2 border-slate-900 text-slate-900 px-2 py-0.5 font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* List */}
            <div className="bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col min-h-0 flex-1">
              <div className="px-5 py-4 border-b-3 border-slate-900 bg-slate-900 text-white flex justify-between items-center flex-shrink-0 font-mono">
                <span className="text-[10px] font-black tracking-widest uppercase">Matches</span>
                <span className="text-[10px] font-black bg-[#ffe600] text-slate-900 border-2 border-slate-900 px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]">{filteredMatches.length}</span>
              </div>

              <div className="overflow-y-auto flex-1 divide-y-2 divide-slate-900 scrollbar-thin">
                {filteredMatches.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs font-bold">
                    [NO_MATCHES_LOADED.ERR]
                  </div>
                ) : filteredMatches.map(match => {
                  const isSelected = selected?.id === match.id
                  const listing = match.listings
                  if (!listing) return null

                  return (
                    <button
                      key={match.id}
                      onClick={() => setSelected(match)}
                      className={`w-full text-left px-5 py-4 transition-all flex flex-col gap-2.5 border-l-4 font-mono ${isSelected ? 'bg-[#00f0ff]/10 border-l-[#ff7a00]' : 'border-l-transparent hover:bg-[#f4f2ed]/50'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black uppercase truncate text-slate-900">{listing.title}</h4>
                          <span className="text-[10px] text-slate-500 mt-0.5 block font-bold">{listing.sponsor_name.toUpperCase()}</span>
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 bg-[#ffe600] border-2 border-slate-900 text-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                          {match.match_score}/10
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] bg-[#f4f2ed] border-2 border-slate-900 font-black text-slate-800 px-2 py-0.5 uppercase">
                            {listing.reward_amount} {listing.reward_token}
                          </span>
                          <span className="text-[9px] bg-[#f4f2ed] border-2 border-slate-900 font-black text-slate-800 px-2 py-0.5 uppercase">
                            {listing.type}
                          </span>
                        </div>

                        {match.status === 'applied' && (
                          <span className="text-[10px] font-black text-slate-900 bg-[#a3e635] border-2 border-slate-900 px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                            APPLIED
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* Right Column: Detail Area */}
          <main className="flex-1 min-h-0 flex flex-col gap-6">
            {!selected ? (
              <div className="border-3 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex-1 flex flex-col items-center justify-center p-8 text-center font-mono">
                <svg className="w-12 h-12 text-slate-800 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs font-black uppercase text-slate-500">[SELECT_MATCH_TO_LOAD_DRAFT.SYS]</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
                
                {/* Details card */}
                <div className="bg-white border-3 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-6 flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                    <div>
                      <span className="text-[9px] bg-[#ffe600] border-2 border-slate-900 text-slate-900 font-black uppercase tracking-wider px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] inline-block">
                        {selected.listings?.type.toUpperCase()}
                      </span>
                      <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight mt-3">{selected.listings?.title}</h2>
                      <span className="text-xs font-mono font-bold text-slate-500 uppercase mt-1 block">SPONSOR: {selected.listings?.sponsor_name.toUpperCase()}</span>
                    </div>

                    <div className="flex-shrink-0">
                      <span className="text-xs font-black bg-[#00f0ff] border-3 border-slate-900 px-4 py-2 text-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase inline-block">
                        🔥 MATCH: {selected.match_score}/10
                      </span>
                    </div>
                  </div>

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {selected.listings?.skills?.map(skill => (
                      <span key={skill} className="text-[10px] font-mono bg-[#f4f2ed] border-2 border-slate-900 text-slate-900 px-3 py-1 font-bold uppercase shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Match Reason logic */}
                  <div className="bg-[#f4f2ed] border-3 border-slate-900 p-4 flex gap-3 items-start">
                    <span className="text-lg flex-shrink-0">💡</span>
                    <p className="text-xs font-mono font-bold text-slate-700 leading-relaxed uppercase">
                      MATCHING_LOGIC: {selected.match_reason}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap gap-3 border-t-2 border-slate-900 pt-5 font-mono">
                    <a
                      href={selected.listings?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black px-5 py-3 bg-[#a3e635] border-3 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 uppercase"
                    >
                      Apply on Superteam
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>

                    <button
                      onClick={() => updateStatus(selected.id, selected.status === 'applied' ? 'pending' : 'applied')}
                      className={`text-xs font-black px-5 py-3 border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 uppercase ${
                        selected.status === 'applied'
                          ? 'bg-[#a3e635] text-slate-900'
                          : 'bg-white text-slate-900'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {selected.status === 'applied' ? 'Applied ✓' : 'Mark Applied'}
                    </button>

                    <button
                      onClick={() => updateStatus(selected.id, 'dismissed')}
                      className="text-xs font-black px-5 py-3 bg-[#f87171] border-3 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 uppercase sm:ml-auto"
                    >
                      Dismiss Match
                    </button>
                  </div>
                </div>

                {/* AI Draft Card styled as a Retro Window Panel */}
                <div className="bg-white border-3 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col overflow-hidden">
                  {/* Retro Window Titlebar */}
                  <div className="bg-slate-900 text-white border-b-3 border-slate-900 px-4 py-2 flex items-center justify-between font-mono">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-black" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-black" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-black" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide">ai_application_draft.txt</span>
                    </div>

                    <button
                      onClick={copyDraft}
                      className={`text-[9px] font-black px-3 py-1 border-2 border-white tracking-widest uppercase transition-all active:scale-95 ${
                        copied ? 'bg-[#a3e635] text-slate-900 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]' : 'bg-slate-950 text-white hover:bg-slate-800'
                      }`}
                    >
                      {copied ? 'Copied ✓' : 'Copy File'}
                    </button>
                  </div>

                  <div className="p-5 flex flex-col gap-4 font-mono">
                    <div className="bg-[#f4f2ed] border-3 border-slate-900 p-5 text-slate-900 text-xs leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto scrollbar-thin">
                      {selected.draft}
                    </div>
                    
                    <div className="text-slate-500 text-[10px] leading-relaxed border-t-2 border-slate-900/40 pt-3 flex gap-2 items-start font-mono">
                      <span className="text-xs">⚠️</span>
                      <p className="mt-0.5 font-bold uppercase text-[9px] tracking-wide text-slate-400">
                        [SYS_WARNING: always edit drafts before submitting to reflect your personal voice]
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </main>

        </div>
      </div>

      {/* Brutalist Footer */}
      <footer className="bg-slate-900 text-[#f4f2ed] border-t-3 border-slate-900 px-8 py-6 font-mono text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-tight text-white">Earn Agent v1.0</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">AI-powered Superteam Earn matcher</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-bold">
            <a 
              href="https://github.com/ritesh59697" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[#ffe600] transition-colors underline decoration-2 underline-offset-4"
            >
              BUILT BY RITESH
            </a>
            <a 
              href="https://t.me/earnagent_bot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[#ffe600] transition-colors underline decoration-2 underline-offset-4"
            >
              TRY THE TELEGRAM BOT
            </a>
            <a 
              href="https://x.com/ritesh5969" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[#ffe600] transition-colors underline decoration-2 underline-offset-4"
            >
              TWITTER/X
            </a>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Not affiliated with Superteam.</span>
          <span>Built for the Agentic Engineering Grant.</span>
        </div>
      </footer>
    </div>
  )
}
