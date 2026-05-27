import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Settings, X, Heart, Star } from 'lucide-react'
import { api, Candidate, GameInfo } from '../api/client'
import { impact, notification } from '../utils/haptic'

const GENDERS = ['M', 'F'] as const
const REGIONS = ['cis', 'eu', 'na', 'asia', 'sa', 'oce'] as const

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Discover({ user }: Props) {
  const navigate = useNavigate()
  const [games, setGames] = useState<GameInfo[]>([])
  const [selectedGame, setSelectedGame] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [matchPopup, setMatchPopup] = useState<{ matchId: number; name: string } | null>(null)
  const [animClass, setAnimClass] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterGender, setFilterGender] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState(0)
  const [filterAgeMax, setFilterAgeMax] = useState(99)

  const hasActiveFilters = filterGender || filterRegion || filterAgeMin > 0 || filterAgeMax < 99

  useEffect(() => {
    api.getGames().then(data => setGames(data.games))
  }, [])

  useEffect(() => {
    setLoading(true)
    setCurrentIdx(0)
    api.getFeed(
      selectedGame,
      filterGender || undefined,
      filterRegion || undefined,
      filterAgeMin || undefined,
      filterAgeMax < 99 ? filterAgeMax : undefined,
    ).then(data => {
      setCandidates(data.candidates)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedGame, filterGender, filterRegion, filterAgeMin, filterAgeMax])

  const current = candidates[currentIdx]
  const hasMore = currentIdx < candidates.length - 1

  const handleLike = async () => {
    if (!current) return
    impact('medium')
    setAnimClass('fadeIn')
    try {
      const res = await api.likeUser(current.user.telegram_id, selectedGame)
      if (res.is_match && res.match_id) {
        notification('success')
        setMatchPopup({ matchId: res.match_id, name: current.user.name })
      }
      setTimeout(() => {
        hasMore ? setCurrentIdx(i => i + 1) : setCandidates([])
        setAnimClass('')
      }, 200)
    } catch { setAnimClass('') }
  }

  const handleSkip = () => {
    impact('light')
    setAnimClass('fadeIn')
    setTimeout(() => {
      hasMore ? setCurrentIdx(i => i + 1) : setCandidates([])
      setAnimClass('')
    }, 200)
  }

  const gameInfo = (key: string) => games.find(g => g.key === key)

  if (matchPopup) {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--background)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '30%', left: '30%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(197, 84, 212, 0.3)', filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '20%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(232, 87, 158, 0.3)', filter: 'blur(60px)',
        }} />

        <div style={{ textAlign: 'center', maxWidth: 320, position: 'relative', zIndex: 2 }}>
          <svg style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'var(--pink)' }} viewBox="0 0 24 24" fill="none">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="var(--pink)" />
          </svg>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }} className="text-gradient">
            It's a Match!
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '24px 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '3px solid var(--primary)',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: '#fff',
            }}>
              {user?.username?.charAt(0)?.toUpperCase() || 'Y'}
            </div>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="var(--pink)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '3px solid var(--pink)',
              background: 'linear-gradient(135deg, var(--pink), var(--primary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: '#fff',
            }}>
              {matchPopup.name.charAt(0)}
            </div>
          </div>

          <p style={{ color: 'var(--muted-foreground)', marginBottom: 28, fontSize: 15 }}>
            You and <strong style={{ color: 'var(--foreground)' }}>{matchPopup.name}</strong> liked each other
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => { impact('medium'); navigate(`/chat/${matchPopup.matchId}`) }}
              className="btn-primary" style={{ padding: 16 }}>
              Start a Chat
            </button>
            <button onClick={() => { impact('light'); setMatchPopup(null) }}
              className="btn-secondary" style={{ padding: 16 }}>
              Keep Swiping
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </main>
    )
  }

  if (candidates.length === 0) {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--background)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, textAlign: 'center',
      }}>
        <div style={{ animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--cyan), var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginBottom: 20, opacity: 0.8,
          }}>
            <Search size={36} />
          </div>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>No candidates found</h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 24, maxWidth: 300, lineHeight: 1.5 }}>
            All clear! Try a different game or check back later
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            <button key="all" className={`chip ${selectedGame === '' ? 'active' : ''}`}
              onClick={() => { impact('light'); setSelectedGame('') }}>
              All
            </button>
            {games.map(g => (
              <button key={g.key} className={`chip ${selectedGame === g.key ? 'active' : ''}`}
                onClick={() => { impact('light'); setSelectedGame(g.key) }}>
                {g.display}
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      {/* Header */}
      <div className="sticky-header" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Discover</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {hasActiveFilters && (
              <span style={{
                borderRadius: 8, background: 'rgba(95,200,221,0.12)', color: 'var(--cyan)',
                padding: '2px 8px', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Filters active
              </span>
            )}
            <button onClick={() => { impact('light'); setShowFilters(p => !p) }}
              style={{
                background: showFilters ? 'var(--primary)' : 'none',
                border: showFilters ? 'none' : '1px solid var(--border)',
                color: showFilters ? '#fff' : 'var(--muted-foreground)',
                cursor: 'pointer', borderRadius: 8, padding: '6px 12px',
                fontSize: 13, fontWeight: 500,
              }}>
              {showFilters ? 'Close' : <><Settings size={14} /> Filters</>}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{
            background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
            animation: 'fadeIn 0.2s ease-out',
          }}>
            {/* Gender */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Gender</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={`chip ${filterGender === '' ? 'active' : ''}`}
                  onClick={() => setFilterGender('')}>Any</button>
                {GENDERS.map(g => (
                  <button key={g} className={`chip ${filterGender === g ? 'active' : ''}`}
                    onClick={() => setFilterGender(g)}>
                    {g === 'M' ? '♂ Male' : '♀ Female'}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>Region</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button className={`chip ${filterRegion === '' ? 'active' : ''}`}
                  onClick={() => setFilterRegion('')}>Any</button>
                {REGIONS.map(r => (
                  <button key={r} className={`chip ${filterRegion === r ? 'active' : ''}`}
                    onClick={() => setFilterRegion(r)}>{r.toUpperCase()}</button>
                ))}
              </div>
            </div>

            {/* Age range */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6, display: 'block' }}>
                Age: {filterAgeMin}–{filterAgeMax}
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" className="input-field" min={14} max={99} value={filterAgeMin}
                  onChange={e => setFilterAgeMin(Math.max(14, Math.min(99, parseInt(e.target.value) || 0)))}
                  style={{ width: 60, fontSize: 13, textAlign: 'center' }} />
                <span style={{ color: 'var(--muted-foreground)' }}>—</span>
                <input type="number" className="input-field" min={14} max={99} value={filterAgeMax}
                  onChange={e => setFilterAgeMax(Math.max(14, Math.min(99, parseInt(e.target.value) || 99)))}
                  style={{ width: 60, fontSize: 13, textAlign: 'center' }} />
                <button className="chip" onClick={() => { setFilterAgeMin(0); setFilterAgeMax(99) }}
                  style={{ marginLeft: 'auto' }}>Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px', scrollbarWidth: 'none' }}>
        <button key="all" className={`chip ${selectedGame === '' ? 'active' : ''}`}
          onClick={() => { impact('light'); setSelectedGame('') }} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          All
        </button>
        {games.map(g => (
          <button key={g.key} className={`chip ${selectedGame === g.key ? 'active' : ''}`}
            onClick={() => { impact('light'); setSelectedGame(g.key) }} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {g.display}
          </button>
        ))}
      </div>

      {/* Profile card */}
      <div style={{ padding: '4px 16px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 400, borderRadius: 16,
          border: '1px solid var(--border)', background: 'var(--card)',
          overflow: 'hidden', position: 'relative',
          animation: animClass === 'fadeIn' ? 'fadeIn 0.3s ease-out' : 'none',
        }}>
          {/* Avatar area */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '3/4',
            background: 'linear-gradient(180deg, rgba(197,84,212,0.15), var(--card))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              border: '3px solid var(--primary)',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48, fontWeight: 700, color: '#fff',
            }}>
              {current.user.name.charAt(0).toUpperCase()}
            </div>

            {/* Online indicator */}
            <div style={{
              position: 'absolute', top: 16, right: 16,
              display: 'flex', alignItems: 'center', gap: 4,
              borderRadius: 12, background: 'rgba(77,212,122,0.15)',
              padding: '4px 8px',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontSize: 12, color: 'var(--green)' }}>Online</span>
            </div>
          </div>

          {/* Info */}
          <div style={{
            padding: 16, marginTop: -60, position: 'relative',
            background: 'linear-gradient(180deg, transparent, var(--card) 30%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700 }}>
                {current.user.name}
              </h2>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="var(--pink)">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4 }}>
              <span>{current.user.age}</span>
              <span>•</span>
              <span>{current.user.region.toUpperCase()}</span>
              <span>•</span>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{Object.values(current.user.games).map(g => g.rank || Object.values(g.roles)[0]).filter(Boolean).join(', ')}</span>
            </div>

            {/* Games */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {Object.entries(current.user.games).map(([gk, gp]) => {
                const gi = gameInfo(gk)
                return (
                  <span key={gk} className="badge game">
                    {gi?.display || gk}: {gp.rank || Object.values(gp.roles)[0] || '?'}
                  </span>
                )
              })}
            </div>

            <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
              Looking for teammates to play with
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button onClick={handleSkip} style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '2px solid var(--destructive)',
            background: 'rgba(232,73,74,0.1)',
            color: 'var(--destructive)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s',
          }} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
             onMouseUp={e => (e.currentTarget.style.transform = '')}>
            <X size={28} />
          </button>
          <button style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '2px solid var(--cyan)',
            background: 'rgba(95,200,221,0.1)',
            color: 'var(--cyan)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s',
          }} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
             onMouseUp={e => (e.currentTarget.style.transform = '')}>
            <Star size={24} />
          </button>
          <button onClick={handleLike} style={{
            width: 56, height: 56, borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--pink))',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(197,84,212,0.3)',
            transition: 'transform 0.15s',
          }} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
             onMouseUp={e => (e.currentTarget.style.transform = '')}>
            <Heart size={28} />
          </button>
        </div>

        <p style={{ color: 'var(--muted-foreground)', fontSize: 12, marginTop: 12 }}>
          {currentIdx + 1} / {candidates.length}
        </p>
      </div>
    </main>
  )
}
