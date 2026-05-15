import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Candidate, GameInfo } from '../api/client'

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
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    api.getGames().then(data => {
      setGames(data.games)
      if (data.games.length > 0) setSelectedGame(data.games[0].key)
    })
  }, [])

  useEffect(() => {
    if (!selectedGame) return
    setLoading(true)
    setCurrentIdx(0)
    api.getFeed(selectedGame).then(data => {
      setCandidates(data.candidates)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedGame])

  const current = candidates[currentIdx]
  const hasMore = currentIdx < candidates.length - 1

  const handleLike = async () => {
    if (!current) return
    setAnimDir('right')
    try {
      const res = await api.likeUser(current.user.telegram_id, selectedGame)
      if (res.is_match && res.match_id) {
        setMatchPopup({ matchId: res.match_id, name: current.user.name })
      }
      setTimeout(() => {
        hasMore ? setCurrentIdx(i => i + 1) : setCandidates([])
        setAnimDir(null)
      }, 200)
    } catch { setAnimDir(null) }
  }

  const handleSkip = () => {
    setAnimDir('left')
    setTimeout(() => {
      hasMore ? setCurrentIdx(i => i + 1) : setCandidates([])
      setAnimDir(null)
    }, 200)
  }

  if (matchPopup) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
        background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--tg-success) 20%, transparent), transparent)',
      }}>
        <div style={{ fontSize: 100, marginBottom: 16, animation: 'matchPulse 0.8s ease-out' }}>🎉</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>It's a Match!</h2>
        <p style={{ color: 'var(--tg-hint)', marginBottom: 32 }}>
          You and <strong>{matchPopup.name}</strong> liked each other
        </p>
        <button className="btn-primary" onClick={() => { setMatchPopup(null); navigate(`/chat/${matchPopup.matchId}`) }}
          style={{ maxWidth: 280, marginBottom: 12 }}>
          💬 Send a message
        </button>
        <button className="btn-secondary" onClick={() => setMatchPopup(null)} style={{ maxWidth: 280 }}>
          Keep browsing
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page" style={{ paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 360, borderRadius: 16, marginBottom: 16 }} />
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>No candidates found</h3>
        <p style={{ color: 'var(--tg-hint)', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
          Try a different game or check back later
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {games.map(g => (
            <button key={g.key} className={`chip ${selectedGame === g.key ? 'active' : ''}`}
              onClick={() => setSelectedGame(g.key)}>
              {g.display}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ paddingTop: 12 }}>
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto',
        paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {games.map(g => (
          <button key={g.key} className={`chip ${selectedGame === g.key ? 'active' : ''}`}
            onClick={() => setSelectedGame(g.key)} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {g.display}
          </button>
        ))}
      </div>

      <div style={{
        animation: animDir === 'right' ? 'slideUp 0.4s ease-out' : animDir === 'left' ? 'fadeIn 0.4s ease-out' : 'none',
      }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: 24, textAlign: 'center', position: 'relative',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--tg-button) 10%, transparent), var(--tg-secondary-bg) 60%)',
          }}>
            <div className="avatar lg" style={{ margin: '0 auto 12px' }}>
              {current.user.name[0].toUpperCase()}
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700 }}>{current.user.name}, {current.user.age}</h3>
            <p style={{ color: 'var(--tg-hint)', fontSize: 14, marginTop: 4 }}>
              {current.user.gender === 'M' ? '♂️' : '♀️'} · {current.user.language} · {current.user.region.toUpperCase()}
            </p>
          </div>

          <div style={{ padding: '12px 16px 20px' }}>
            <div style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 8, fontWeight: 600 }}>GAMES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(current.user.games).map(([gk, gp]) => {
                const gInfo = games.find(g => g.key === gk)
                return (
                  <span key={gk} className="badge game">
                    {gInfo?.display || gk}: {gp.rank || Object.values(gp.roles)[0] || '?'}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 20 }}>
          <button onClick={handleSkip} style={{
            width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--tg-danger)',
            background: 'color-mix(in srgb, var(--tg-danger) 10%, transparent)',
            color: 'var(--tg-danger)', fontSize: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s',
          }} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
             onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
            ✕
          </button>
          <button onClick={handleLike} style={{
            width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--tg-success)',
            background: 'color-mix(in srgb, var(--tg-success) 10%, transparent)',
            color: 'var(--tg-success)', fontSize: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s',
          }} onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
             onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
            ♥
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--tg-hint)', fontSize: 12, marginTop: 12 }}>
          {currentIdx + 1} / {candidates.length}
        </p>
      </div>
    </div>
  )
}
