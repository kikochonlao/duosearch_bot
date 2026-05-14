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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchId) return
    const mid = parseInt(matchId)
    Promise.all([
      api.getMessages(mid),
      api.getMatches(),
    ]).then(([msgs, matches]) => {
      setMessages(msgs)
      setMatchInfo(matches.find(m => m.id === mid) || null)
      setLoading(false)
      bottomRef.current?.scrollIntoView()
    }).catch(() => setLoading(false))
  }, [matchId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !matchId) return
    const mid = parseInt(matchId)
    try {
      const msg = await api.sendMessage(mid, text.trim())
      setMessages(prev => [...prev, msg])
      setText('')
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh', color: '#8e9eab' }}>Loading chat...</div>
  }

  const otherName = matchInfo?.matched_user.name || 'Chat'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', padding: '8px 12px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
        borderBottom: '1px solid #2b3b4a', marginBottom: 8,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#2ea6ff', fontSize: '18px', cursor: 'pointer' }}>←</button>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', backgroundColor: '#2b3b4a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
        }}>{otherName[0]}</div>
        <span style={{ fontWeight: 600 }}>{otherName}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8e9eab', paddingTop: '40px', fontSize: '14px' }}>
            No messages yet. Say hello!
          </div>
        )}
        {messages.map(msg => {
          const isMine = user && msg.from_telegram_id === user.telegram_id
          return (
            <div key={msg.id} style={{
              display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
              marginBottom: 8,
            }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: '16px',
                backgroundColor: isMine ? '#2ea6ff' : '#1f2a36',
                color: isMine ? '#fff' : '#fff',
                fontSize: '15px', wordBreak: 'break-word',
              }}>
                {msg.text}
                <div style={{
                  fontSize: '10px', color: isMine ? 'rgba(255,255,255,0.6)' : '#8e9eab',
                  marginTop: 4, textAlign: 'right',
                }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '12px 14px', borderRadius: '20px', border: '1px solid #2b3b4a',
            backgroundColor: '#1f2a36', color: '#fff', fontSize: '15px', outline: 'none',
          }} />
        <button onClick={handleSend} disabled={!text.trim()} style={{
          width: 44, height: 44, borderRadius: '50%', border: 'none',
          backgroundColor: text.trim() ? '#2ea6ff' : '#2b3b4a',
          color: '#fff', fontSize: '18px', cursor: text.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>↑</button>
      </div>
    </div>
  )
}
