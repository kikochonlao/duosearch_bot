import { useParams, useNavigate } from 'react-router-dom'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function MatchScreen({ user }: Props) {
  const { matchId } = useParams()
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '24px'
    }}>
      <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎉</div>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>It's a Match!</h2>
      <p style={{ color: '#8e9eab', marginBottom: '40px', fontSize: '15px' }}>
        You and your teammate liked each other!
      </p>
      <button onClick={() => navigate(`/chat/${matchId}`)} style={{
        width: '100%', maxWidth: '280px', padding: '14px', borderRadius: '12px',
        border: 'none', backgroundColor: '#2ea6ff', color: '#fff',
        fontSize: '17px', fontWeight: 600, cursor: 'pointer', marginBottom: 12,
      }}>
        Send a message
      </button>
      <button onClick={() => navigate('/discover')} style={{
        width: '100%', maxWidth: '280px', padding: '14px', borderRadius: '12px',
        border: '1px solid #2b3b4a', backgroundColor: 'transparent', color: '#8e9eab',
        fontSize: '17px', cursor: 'pointer',
      }}>
        Keep browsing
      </button>
    </div>
  )
}
