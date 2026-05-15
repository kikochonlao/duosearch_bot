import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Welcome({ user }: Props) {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => { setShow(true) }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      textAlign: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--tg-button) 15%, transparent), transparent 60%), var(--tg-bg)',
    }}>
      <div style={{
        animation: show ? 'matchPulse 0.8s ease-out' : 'none',
        fontSize: 72, marginBottom: 8, lineHeight: 1,
      }}>
        🎮
      </div>

      <h1 style={{
        fontSize: 36, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5,
        background: 'linear-gradient(135deg, var(--tg-text), var(--tg-button))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Duosearch
      </h1>

      <p style={{
        color: 'var(--tg-hint)', fontSize: 15, lineHeight: 1.6,
        marginBottom: 48, maxWidth: 300,
        animation: show ? 'slideUp 0.6s ease-out 0.2s both' : 'none',
      }}>
        Find your perfect gaming teammate.<br />
        Connect, play, and win together.
      </p>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300,
        animation: show ? 'slideUp 0.6s ease-out 0.35s both' : 'none',
      }}>
        <button className="btn-primary" onClick={() => navigate('/register')}>
          Get Started
        </button>
        <button className="btn-secondary" onClick={() => navigate('/register')}>
          I already have an account
        </button>
      </div>
    </div>
  )
}
