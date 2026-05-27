import { useParams, useNavigate } from 'react-router-dom'
import { PartyPopper, MessageCircle } from 'lucide-react'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function MatchScreen({ user }: Props) {
  const { matchId } = useParams()
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', padding: 24, textAlign: 'center',
      background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--tg-success) 20%, transparent), transparent)',
    }}>
      <div style={{ marginBottom: 16, animation: 'matchPulse 0.8s ease-out' }}><PartyPopper size={100} /></div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, animation: 'slideUp 0.5s ease-out 0.2s both' }}>
        It's a Match!
      </h2>
      <p style={{ color: 'var(--tg-hint)', marginBottom: 40, animation: 'slideUp 0.5s ease-out 0.3s both' }}>
        Start chatting with your new teammate!
      </p>
      <button className="btn-primary" onClick={() => navigate(`/chat/${matchId}`)}
        style={{ maxWidth: 280, marginBottom: 12, animation: 'slideUp 0.5s ease-out 0.4s both' }}>
        <MessageCircle size={18} /> Send a message
      </button>
      <button className="btn-secondary" onClick={() => navigate('/discover')} style={{ maxWidth: 280, animation: 'slideUp 0.5s ease-out 0.5s both' }}>
        Keep browsing
      </button>
    </div>
  )
}
