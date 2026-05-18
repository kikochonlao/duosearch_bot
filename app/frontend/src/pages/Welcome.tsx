import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const HEART_LOGO = (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 48, height: 48 }}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#heart-g)" />
    <defs>
      <linearGradient id="heart-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c554d4" />
        <stop offset="100%" stopColor="#e8579e" />
      </linearGradient>
    </defs>
  </svg>
)

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Welcome({ user }: Props) {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => { setShow(true) }, [])

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24, position: 'relative',
      overflow: 'hidden',
      opacity: show ? 1 : 0, transition: 'opacity 0.5s',
    }}>
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(197, 84, 212, 0.15)', filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '-20%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(122, 107, 219, 0.1)', filter: 'blur(60px)',
      }} />

      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', maxWidth: 360, width: '100%',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          }}>
            {HEART_LOGO}
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
            DuoSearch
          </span>
        </div>

        <h1 style={{
          fontSize: 40, fontWeight: 700, lineHeight: 1.15,
          letterSpacing: -0.5, marginBottom: 8,
        }}>
          Find your{' '}
          <span className="text-gradient">permanent duo</span>
        </h1>

        <p style={{
          fontSize: 16, color: 'var(--muted-foreground)',
          lineHeight: 1.5, marginBottom: 8,
        }}>
          More than a match.{' '}
          <span style={{ color: 'var(--foreground)' }}>It's your gaming story.</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300, marginTop: 16 }}>
          <button onClick={() => navigate('/register')} className="btn-primary" style={{ padding: 16 }}>
            Get Started
          </button>
          <button onClick={() => navigate('/register')} className="btn-secondary" style={{ padding: 16 }}>
            Log In
          </button>
        </div>
      </div>
    </main>
  )
}
