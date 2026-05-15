import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, MessageItem, MatchItem } from '../api/client'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Chat({ user }: Props) {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [matchInfo, setMatchInfo] = useState<MatchItem | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!matchId) return
    const mid = parseInt(matchId)
    Promise.all([api.getMessages(mid), api.getMatches()]).then(([msgs, matches]) => {
      setMessages(msgs)
      setMatchInfo(matches.find(m => m.id === mid) || null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [matchId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!matchId) return
      try {
        const msgs = await api.getMessages(parseInt(matchId))
        if (msgs.length !== messages.length) setMessages(msgs)
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [matchId, messages.length])

  const handleSend = async () => {
    if (!text.trim() || !matchId || sending) return
    setSending(true)
    try {
      const msg = await api.sendMessage(parseInt(matchId), text.trim())
      setMessages(prev => [...prev, msg])
      setText('')
    } catch (e: any) { alert(e.message) }
    finally { setSending(false); inputRef.current?.focus() }
  }

  if (loading) return <div className="page"><div className="skeleton" style={{ height: '70vh' }} /></div>

  const otherName = matchInfo?.matched_user.name || 'Chat'
  const myTgId = user?.telegram_id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', padding: '0 12px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
        borderBottom: '1px solid var(--tg-border)',
      }}>
        <div className="avatar sm">{otherName[0]}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{otherName}</div>
          <div style={{ color: 'var(--tg-hint)', fontSize: 12 }}>Online</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tg-hint)', paddingTop: 40, fontSize: 14 }}>
            Say hello! 👋
          </div>
        )}
        {messages.map(msg => {
          const isMine = myTgId && msg.from_telegram_id === myTgId
          return (
            <div key={msg.id} style={{
              display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
              animation: 'slideDown 0.2s ease-out',
            }}>
              <div style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: 16,
                background: isMine ? 'var(--tg-button)' : 'var(--tg-secondary-bg)',
                color: isMine ? 'var(--tg-button-text)' : 'var(--tg-text)',
                fontSize: 15, wordBreak: 'break-word',
                borderBottomRightRadius: isMine ? 4 : 16,
                borderBottomLeftRadius: isMine ? 16 : 4,
              }}>
                {msg.text}
                <div style={{
                  fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right',
                }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 0 16px', borderTop: '1px solid var(--tg-border)' }}>
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a message..."
          className="input-field" style={{ borderRadius: 20, flex: 1 }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending} style={{
          width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: text.trim() ? 'var(--tg-button)' : 'var(--tg-border)',
          color: 'var(--tg-button-text)', fontSize: 20, cursor: text.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          ↑
        </button>
      </div>
    </div>
  )
}
