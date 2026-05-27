import { useNavigate } from 'react-router-dom'
import { Pencil, Globe, Bell, ChevronRight, MapPin } from 'lucide-react'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function Settings({ user }: Props) {
  const navigate = useNavigate()

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Settings</h2>

      <div className="card" style={{ padding: 0 }}>
        <SettingItem label="Edit Profile" icon={Pencil} onClick={() => navigate('/profile/edit')} />
        <SettingItem label="Language" icon={Globe} value="Russian" />
        <SettingItem label="Region" icon={MapPin} value="CIS" />
        <SettingItem label="Notifications" icon={Bell} value="Enabled" />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--tg-hint)', marginBottom: 4 }}>Telegram ID</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.telegram_id || '—'}</div>
      </div>
    </div>
  )
}

function SettingItem({ label, icon: Icon, value, onClick }: { label: string; icon: typeof Pencil; value?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 16px', cursor: onClick ? 'pointer' : 'default',
      borderBottom: '1px solid var(--tg-border)',
      transition: 'opacity 0.2s',
    }}>
      <span style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={18} />}{label}
      </span>
      <span style={{ color: 'var(--tg-hint)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
        {value}
        {onClick && <ChevronRight size={16} />}
      </span>
    </div>
  )
}
