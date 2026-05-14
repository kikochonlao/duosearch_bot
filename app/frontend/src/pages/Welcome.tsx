import { useNavigate } from 'react-router-dom'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Welcome({ user }: Props) {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '24px'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎮</div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Duosearch</h1>
      <p style={{ color: '#8e9eab', marginBottom: '32px', fontSize: '15px', lineHeight: '1.5' }}>
        Find your perfect gaming teammate.<br />
        Connect, play, and win together.
      </p>

      <button onClick={() => navigate('/register')} style={{
        backgroundColor: '#2ea6ff', color: '#fff', border: 'none',
        borderRadius: '12px', padding: '14px 48px', fontSize: '17px',
        fontWeight: '600', cursor: 'pointer', marginBottom: '12px',
        width: '100%', maxWidth: '280px',
      }}>
        Get Started
      </button>

      <button onClick={() => navigate('/register')} style={{
        backgroundColor: 'transparent', color: '#8e9eab', border: '1px solid #2b3b4a',
        borderRadius: '12px', padding: '14px 48px', fontSize: '17px',
        cursor: 'pointer', width: '100%', maxWidth: '280px',
      }}>
        I already have an account
      </button>
    </div>
  )
}
