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
    try {
      const res = await api.likeUser(current.user.telegram_id, selectedGame)
      if (res.is_match && res.match_id) {
        setMatchPopup({ matchId: res.match_id, name: current.user.name })
      }
      if (hasMore) setCurrentIdx(i => i + 1)
      else setCandidates([])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleSkip = () => {
    if (hasMore) setCurrentIdx(i => i + 1)
    else setCandidates([])
  }

  if (matchPopup) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '24px'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>It's a Match!</h2>
        <p style={{ color: '#8e9eab', marginBottom: '32px' }}>
          You matched with <strong>{matchPopup.name}</strong>
        </p>
        <button onClick={() => { setMatchPopup(null); navigate(`/chat/${matchPopup.matchId}`) }}
          style={{ ...btnStyle, maxWidth: '280px', marginBottom: 12 }}>
          Send a message
        </button>
        <button onClick={() => setMatchPopup(null)}
          style={{ ...btnStyle, maxWidth: '280px', backgroundColor: 'transparent', border: '1px solid #2b3b4a', color: '#8e9eab' }}>
          Keep browsing
        </button>
      </div>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh', color: '#8e9eab' }}>Loading candidates...</div>
  }

  if (candidates.length === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '30vh', padding: '24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>😔</div>
        <h3 style={{ marginBottom: '8px' }}>No candidates found</h3>
        <p style={{ color: '#8e9eab', fontSize: '14px', marginBottom: '20px' }}>
          Try selecting a different game or check back later
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {games.map(g => (
            <button key={g.key} onClick={() => setSelectedGame(g.key)}
              style={{
                padding: '8px 14px', borderRadius: '20px', border: selectedGame === g.key ? '2px solid #2ea6ff' : '1px solid #2b3b4a',
                backgroundColor: selectedGame === g.key ? 'rgba(46,166,255,0.15)' : 'transparent',
                color: selectedGame === g.key ? '#2ea6ff' : '#8e9eab', fontSize: '13px', cursor: 'pointer',
              }}>
              {g.display}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <div style={{ marginBottom: 16 }}>
        <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #2b3b4a',
            backgroundColor: '#1f2a36', color: '#fff', fontSize: '15px',
          }}>
          {games.map(g => <option key={g.key} value={g.key}>{g.display}</option>)}
        </select>
      </div>

      <div style={{
        backgroundColor: '#1f2a36', borderRadius: '16px', padding: '24px',
        textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', backgroundColor: '#2b3b4a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', margin: '0 auto 12px',
        }}>
          {current.user.name[0].toUpperCase()}
        </div>
        <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{current.user.name}, {current.user.age}</h3>
        <p style={{ color: '#8e9eab', fontSize: '13px', marginBottom: '12px' }}>
          {current.user.language} · {current.user.region.toUpperCase()}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {Object.entries(current.user.games).map(([gk, gp]) => (
            <span key={gk} style={{
              padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(46,166,255,0.1)',
              color: '#2ea6ff', fontSize: '12px',
            }}>
              {games.find(g => g.key === gk)?.display || gk}: {gp.rank || Object.values(gp.roles)[0] || '?'}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        <button onClick={handleSkip} style={{
          width: 64, height: 64, borderRadius: '50%', border: '2px solid #ff4d4d',
          backgroundColor: 'transparent', color: '#ff4d4d', fontSize: '28px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
        <button onClick={handleLike} style={{
          width: 64, height: 64, borderRadius: '50%', border: '2px solid #4caf50',
          backgroundColor: 'transparent', color: '#4caf50', fontSize: '28px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>♥</button>
      </div>

      <p style={{ textAlign: 'center', color: '#8e9eab', fontSize: '12px', marginTop: 8 }}>
        {currentIdx + 1} / {candidates.length}
      </p>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  backgroundColor: '#2ea6ff', color: '#fff', fontSize: '17px', fontWeight: 600, cursor: 'pointer',
}
