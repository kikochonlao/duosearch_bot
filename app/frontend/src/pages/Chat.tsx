import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Ban, AlertTriangle, ArrowUp, Check, CheckCheck, Sparkles } from 'lucide-react'
import { api, MessageItem, MatchItem } from '../api/client'
import { impact } from '../utils/haptic'
import { tgAlert, tgConfirm, tgPrompt } from '../utils/telegram'

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
  const [showMenu, setShowMenu] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchId) return
    const mid = parseInt(matchId)
    Promise.all([api.getMessages(mid), api.getMatches()]).then(([msgs, matches]) => {
      setMessages(msgs)
      setMatchInfo(matches.find(m => m.id === mid) || null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [matchId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!matchId) return
      try {
        const msgs = await api.getMessages(parseInt(matchId))
        if (msgs.length !== messages.length) setMessages(msgs)
      } catch {}
    }, 1500)
    return () => clearInterval(interval)
  }, [matchId, messages.length])

  useEffect(() => {
    if (!matchId || !messages.length) return
    const mid = parseInt(matchId)
    const hasUnread = messages.some(m => m.from_telegram_id !== user?.telegram_id && !m.read_at)
    if (hasUnread) {
      api.markAsRead(mid).catch(() => {})
    }
  }, [matchId, messages, user?.telegram_id])

  const handleBlock = async () => {
    if (!matchInfo) return
    const targetId = matchInfo.matched_user.telegram_id
    if (!(await tgConfirm(`Block ${matchInfo.matched_user.name}?`))) return
    try {
      await api.blockUser(targetId)
      await tgAlert('User blocked')
      navigate('/chats')
    } catch (e: any) { await tgAlert(e.message) }
    setShowMenu(false)
  }

  const handleReport = async () => {
    if (!matchInfo) return
    const reason = await tgPrompt('Reason for report:')
    if (!reason) return
    try {
      const res = await api.reportUser(matchInfo.matched_user.telegram_id, reason)
      await tgAlert(res.auto_banned ? 'User was banned due to multiple reports' : 'Report submitted')
      navigate('/chats')
    } catch (e: any) { await tgAlert(e.message) }
    setShowMenu(false)
  }

  const handleSend = async () => {
    if (!text.trim() || !matchId || sending) return
    impact('light')
    setSending(true)
    try {
      const msg = await api.sendMessage(parseInt(matchId), text.trim())
      setMessages(prev => [...prev, msg])
      setText('')
    } catch (e: any) { await tgAlert(e.message) }
    finally { setSending(false); inputRef.current?.focus() }
  }

  if (loading) return <div className="page"><div className="skeleton" style={{ height: '70vh' }} /></div>

  const menuItemStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '12px 16px', border: 'none',
    background: 'none', color: 'var(--tg-text)', fontSize: 14, textAlign: 'left',
    cursor: 'pointer', fontFamily: 'inherit',
    borderBottom: '1px solid var(--tg-border)',
  }

  const partner = matchInfo?.matched_user
  const otherName = partner?.name || 'Chat'
  const myTgId = user?.telegram_id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', padding: '0 12px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
        borderBottom: '1px solid var(--tg-border)', position: 'relative',
      }}>
        <div onClick={() => matchInfo && navigate(`/user/${matchInfo.matched_user.telegram_id}`, { state: { profile: matchInfo.matched_user } })}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>
            {partner?.photo_url ? (
              <img src={partner.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!.innerText = otherName[0]) }} />
            ) : otherName[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{otherName}</div>
            <div style={{ color: 'var(--tg-hint)', fontSize: 12 }}>Online</div>
          </div>
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => { impact('light'); setShowMenu(p => !p) }}
            style={{ background: 'none', border: 'none', color: 'var(--tg-hint)', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>
            ⋯
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 100,
              background: 'var(--tg-secondary-bg)', borderRadius: 12,
              border: '1px solid var(--tg-border)', overflow: 'hidden',
              minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              {matchInfo && (
                <button onClick={() => { setShowMenu(false); navigate(`/duo/${matchInfo.id}`) }}
                  style={menuItemStyle}><Sparkles size={16} /> Duo Journey</button>
              )}
              <button onClick={handleBlock} style={menuItemStyle}><Ban size={16} /> Block user</button>
              <button onClick={handleReport} style={menuItemStyle}><AlertTriangle size={16} /> Report user</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tg-hint)', paddingTop: 40, fontSize: 14 }}>
            Say hello!
          </div>
        )}
        {messages.map(msg => {
          const isMine = myTgId && msg.from_telegram_id === myTgId
          const isRead = !!msg.read_at
          return (
            <div key={msg.id} style={{
              display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
              animation: 'messageBounce 0.25s ease-out',
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
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
                  fontSize: 10, opacity: 0.6, marginTop: 4,
                }}>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMine && (
                    isRead ? <CheckCheck size={14} style={{ color: 'var(--blue)' }} /> : <Check size={14} />
                  )}
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
          color: 'var(--tg-button-text)', cursor: text.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          <ArrowUp size={20} />
        </button>
      </div>
    </div>
  )
}
