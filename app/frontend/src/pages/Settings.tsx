import { useNavigate } from 'react-router-dom'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Settings({ user }: Props) {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '24px 16px 100px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Settings</h2>

      <div style={{ marginBottom: 8 }}>
        <SettingItem label="Edit Profile" onClick={() => navigate('/profile/edit')} />
        <SettingItem label="Language" value="Russian" />
        <SettingItem label="Region" value="CIS" />
        <SettingItem label="Notifications" value="Enabled" />
      </div>

      <div style={{ marginTop: 32, padding: '16px', backgroundColor: '#1f2a36', borderRadius: '12px' }}>
        <p style={{ color: '#8e9eab', fontSize: '13px', marginBottom: 4 }}>Telegram ID</p>
        <p style={{ fontSize: '14px' }}>{user?.telegram_id || '—'}</p>
      </div>
    </div>
  )
}

function SettingItem({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 16px', backgroundColor: '#1f2a36', borderRadius: '10px',
      marginBottom: '6px', cursor: onClick ? 'pointer' : 'default',
    }}>
      <span style={{ fontSize: '15px' }}>{label}</span>
      <span style={{ color: '#8e9eab', fontSize: '14px' }}>
        {value || '→'}
      </span>
    </div>
  )
}
