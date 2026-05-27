import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, X, ArrowUp, Lock } from 'lucide-react'
import { api, LobbyDetail, LobbyMessageInfo, GameInfo } from '../api/client'
import { impact } from '../utils/haptic'

const GAME_GRADIENTS: Record<string, string> = {
  cs2: 'linear-gradient(135deg, #f59e0b, #d97706)',
  dota2: 'linear-gradient(135deg, #22c55e, #166534)',
  valorant: 'linear-gradient(135deg, #ef4444, #991b1b)',
  overwatch: 'linear-gradient(135deg, #f97316, #ea580c)',
  apex: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
  lol: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
  fortnite: 'linear-gradient(135deg, #a855f7, #6b21a8)',
  rocket_league: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  pubg: 'linear-gradient(135deg, #eab308, #854d0e)',
}

function getGameIcon(games: GameInfo[], key: string): string {
  return games.find(g => g.key === key)?.icon || '🎮'
}

function getGameDisplay(games: GameInfo[], key: string): string {
  return games.find(g => g.key === key)?.display || key
}

function getGameGradient(key: string): string {
  return GAME_GRADIENTS[key] || 'linear-gradient(135deg, var(--primary), var(--pink))'
}

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function LobbyView({ user }: Props) {
  const { lobbyId } = useParams()
  const navigate = useNavigate()
  const [lobby, setLobby] = useState<LobbyDetail | null>(null)
  const [messages, setMessages] = useState<LobbyMessageInfo[]>([])
  const [games, setGames] = useState<GameInfo[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const id = Number(lobbyId)

  useEffect(() => { api.getGames().then(data => setGames(data.games)) }, [])

  const loadLobby = () => {
    api.getLobby(id).then(setLobby).catch(() => setError('Lobby not found'))
      .finally(() => setLoading(false))
  }

  const loadMessages = () => {
    api.getLobbyMessages(id).then(setMessages).catch(() => {})
  }

  useEffect(() => {
    loadLobby()
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim()) return
    impact('light')
    setSending(true)
    try {
      await api.sendLobbyMessage(id, text.trim())
      setText('')
      await loadMessages()
    } catch (e: any) {
      setError(e.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleJoin = async () => {
    impact('medium')
    try {
      const res = await api.joinLobby(id)
      loadLobby()
    } catch (e: any) {
      setError(e.message || 'Failed to join')
    }
  }

  const handleLeave = async () => {
    impact('medium')
    await api.leaveLobby(id)
    navigate('/lobbies')
  }

  const handleClose = async () => {
    impact('medium')
    await api.closeLobby(id)
    loadLobby()
  }

  const handleApprove = async (userId: number) => {
    impact('light')
    await api.approveMember(id, userId)
    loadLobby()
  }

  const handleKick = async (userId: number) => {
    impact('light')
    await api.kickMember(id, userId)
    loadLobby()
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </main>
    )
  }

  if (!lobby) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 40 }}>
        <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 40 }}>{error || 'Lobby not found'}</p>
        <button onClick={() => navigate('/lobbies')} style={{
          display: 'block', margin: '16px auto', background: 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, cursor: 'pointer',
        }}>Back to Lobbies</button>
      </main>
    )
  }

  const me = lobby.members.find(m => m.telegram_id === user?.telegram_id)
  const isCreator = lobby.creator_id === me?.user_id
  const isMember = !!me && me.status === 'approved'
  const isPending = !!me && me.status === 'pending'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: getGameGradient(lobby.game),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}>
          {getGameIcon(games, lobby.game)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{lobby.title}</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>
            {getGameDisplay(games, lobby.game)} · {lobby.creator_name} · {lobby.member_count}/{lobby.max_players}
            {!lobby.is_public ? ' · ' : ''}{!lobby.is_public && <Lock size={12} />}
          </div>
        </div>
        {isCreator && lobby.status === 'open' && (
          <button onClick={handleClose} style={{
            background: 'rgba(255,77,77,0.12)', color: '#ff4d4d', border: 'none',
            borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
          }}>Close</button>
        )}
      </div>

      {lobby.description && (
        <p style={{ padding: '8px 16px', color: 'var(--muted-foreground)', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
          {lobby.description}
        </p>
      )}

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>
          Members ({lobby.member_count}/{lobby.max_players})
        </div>
        {lobby.members.filter(m => m.status === 'approved').map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <div className="avatar sm">{m.name[0].toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                {m.role === 'creator' ? 'Creator' : 'Member'}
              </div>
            </div>
            {isCreator && m.role !== 'creator' && (
              <button onClick={() => handleKick(m.user_id)} style={{
                background: 'none', border: 'none', color: 'var(--muted-foreground)',
                cursor: 'pointer', padding: 4, display: 'flex',
              }}><X size={18} /></button>
            )}
          </div>
        ))}
        {lobby.members.filter(m => m.status === 'pending').length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginTop: 12, marginBottom: 6 }}>
              Pending requests
            </div>
            {lobby.members.filter(m => m.status === 'pending').map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <div className="avatar sm">{m.name[0].toUpperCase()}</div>
                <div style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
                {isCreator && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleApprove(m.user_id)} style={{
                      background: 'rgba(77,212,122,0.12)', color: 'var(--green)',
                      border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                    }}>Approve</button>
                    <button onClick={() => handleKick(m.user_id)} style={{
                      background: 'rgba(255,77,77,0.12)', color: '#ff4d4d',
                      border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                    }}>Deny</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {!isMember && !isPending && lobby.status === 'open' && (
        <div style={{ padding: 16 }}>
          <button onClick={handleJoin} style={{
            width: '100%', padding: 12, borderRadius: 12,
            background: 'var(--primary)', color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            {lobby.is_public ? 'Join Lobby' : 'Request to Join'}
          </button>
        </div>
      )}
      {isPending && (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 14 }}>
          Join requested — waiting for approval
        </div>
      )}

      {isMember && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, marginTop: 24 }}>
                No messages yet. Start the conversation!
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} style={{
                alignSelf: msg.user_id === me?.user_id ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}>
                {msg.user_id !== me?.user_id && (
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2, marginLeft: 4 }}>
                    {msg.name}
                  </div>
                )}
                <div style={{
                  padding: '8px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.4,
                  background: msg.user_id === me?.user_id ? 'var(--primary)' : 'var(--secondary)',
                  color: msg.user_id === me?.user_id ? '#fff' : 'var(--foreground)',
                  borderBottomRightRadius: msg.user_id === me?.user_id ? 4 : 14,
                  borderBottomLeftRadius: msg.user_id !== me?.user_id ? 4 : 14,
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{
            display: 'flex', gap: 8, padding: '8px 12px', flexShrink: 0,
            borderTop: '1px solid var(--border)', background: 'var(--background)',
          }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--secondary)', color: 'var(--foreground)', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={handleSend} disabled={sending || !text.trim()} style={{
              width: 42, height: 42, borderRadius: 12,
              background: text.trim() ? 'var(--primary)' : 'var(--border)',
              border: 'none', color: '#fff', cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><ArrowUp size={20} /></button>
          </div>
        </>
      )}

      {isMember && lobby.status !== 'open' && (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 14 }}>
          This lobby is {lobby.status}
        </div>
      )}

      {isMember && (
        <div style={{ padding: '8px 16px 16px', textAlign: 'center', flexShrink: 0 }}>
          <button onClick={handleLeave} style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--muted-foreground)',
            borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer', width: '100%',
          }}>Leave Lobby</button>
        </div>
      )}
    </div>
  )
}
