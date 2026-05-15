import { useNavigate } from 'react-router-dom'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Settings({ user }: Props) {
  const navigate = useNavigate()

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Settings</h2>

      <div className="card" style={{ padding: 0 }}>
        <SettingItem label="✏️ Edit Profile" onClick={() => navigate('/profile/edit')} />
        <SettingItem label="🌐 Language" value="Russian" />
        <SettingItem label="📍 Region" value="CIS" />
        <SettingItem label="🔔 Notifications" value="Enabled" />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 4 }}>Telegram ID</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.telegram_id || '—'}</div>
      </div>
    </div>
  )
}

function SettingItem({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 16px', cursor: onClick ? 'pointer' : 'default',
      borderBottom: '1px solid var(--tg-border)',
      transition: 'opacity 0.2s',
    }}>
      <span style={{ fontSize: 15 }}>{label}</span>
      <span style={{ color: 'var(--tg-hint)', fontSize: 14 }}>
        {value || '→'}
      </span>
    </div>
  )
}
