import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Pencil, MapPin, Languages, Gamepad2 } from 'lucide-react'
import { api, Profile, GameInfo, SteamGame } from '../api/client'
import { impact } from '../utils/haptic'

interface Props {
  user: { telegram_id: number; username: string | null; is_registered: boolean } | null
}

export default function ProfilePage({ user }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [games, setGames] = useState<GameInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [steamGames, setSteamGames] = useState<SteamGame[]>([])
  const [steamLoading, setSteamLoading] = useState(false)
  const [showSteamInput, setShowSteamInput] = useState(false)
  const [steamInput, setSteamInput] = useState('')

  useEffect(() => {
    Promise.all([api.getProfile(), api.getGames()]).then(([p, g]) => {
      setProfile(p)
      setGames(g.games)
      setLoading(false)
      if (p.steam_id) {
        setSteamLoading(true)
        api.getSteamGames().then(res => setSteamGames(res.games)).catch(() => {}).finally(() => setSteamLoading(false))
      }
    }).catch(() => setLoading(false))
  }, [])

  const handleConnectSteam = async () => {
    if (!steamInput.trim()) return
    impact('light')
    try {
      const res = await api.connectSteam(steamInput.trim())
      setProfile(prev => prev ? { ...prev, steam_id: res.steam_id } : prev)
      setShowSteamInput(false)
      setSteamInput('')
      setSteamLoading(true)
      const sg = await api.getSteamGames()
      setSteamGames(sg.games)
    } catch (e: any) { alert(e.message) }
    finally { setSteamLoading(false) }
  }

  const handleDisconnectSteam = async () => {
    if (!confirm('Disconnect Steam account?')) return
    try {
      await api.disconnectSteam()
      setProfile(prev => prev ? { ...prev, steam_id: null } : prev)
      setSteamGames([])
    } catch (e: any) { alert(e.message) }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--background)', padding: 24, paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </main>
    )
  }

  if (!profile) {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--background)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, textAlign: 'center',
      }}>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: 16 }}>Please register first</p>
        <button className="btn-primary" onClick={() => navigate('/register')} style={{ maxWidth: 200, padding: 14 }}>
          Register
        </button>
      </main>
    )
  }

  const matchCount = Object.keys(profile.games).length.toString()

  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 80 }}>
      <div className="sticky-header">
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Profile</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/profile/edit')}
            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex' }}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
        <div style={{ position: 'relative' }}>
          <div className="avatar xl">
            <div>
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!.innerText = profile.name.charAt(0).toUpperCase()) }} />
              ) : profile.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <button onClick={() => navigate('/profile/edit')} style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid var(--card)',
            background: 'var(--secondary)', color: 'var(--foreground)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Pencil size={14} />
          </button>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 16 }}>{profile.name}</h2>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4,
        }}>
          <span>{profile.age}</span>
          <span>•</span>
          <span>{profile.region.toUpperCase()}</span>
          <span>•</span>
          <span style={{
            borderRadius: 8, background: 'rgba(197,84,212,0.12)',
            color: 'var(--primary)', padding: '2px 8px', fontSize: 11, fontWeight: 500,
          }}>
            {profile.gender === 'M' ? '♂ Male' : '♀ Female'}
          </span>
        </div>

        <button onClick={() => navigate('/profile/edit')}
          className="btn-secondary"
          style={{ marginTop: 16, padding: '10px 24px', width: 'auto', fontSize: 14 }}>
          <Pencil size={14} /> Edit Profile
        </button>
      </div>

      {/* Stats */}
      <div style={{
        margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, borderRadius: 12, border: '1px solid var(--border)',
        background: 'var(--card)', padding: 16,
      }}>
        {[
          { value: matchCount, label: 'Games' },
          { value: steamGames.length.toString() || '—', label: 'Steam games' },
          { value: profile.steam_id ? '✓' : '—', label: 'Steam' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Blog */}
      {profile.blog && (
        <section style={{ padding: '24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>My blog</h3>
            <button onClick={() => navigate('/profile/edit')}
              style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 13 }}>
              Edit
            </button>
          </div>
          <div style={{
            fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)',
            whiteSpace: 'pre-wrap',
          }}>
            {profile.blog}
          </div>
        </section>
      )}

      {/* About me */}
      <section style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>About me</h3>
          <button onClick={() => navigate('/profile/edit')}
            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 13 }}>
            Edit
          </button>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)' }}>
          {profile.bio || 'Looking for teammates to play with'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', fontSize: 14 }}>
            <MapPin size={16} />
            <span>Region: {profile.region.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', fontSize: 14 }}>
            <Languages size={16} />
            <span>Language: {profile.language}</span>
          </div>
        </div>
      </section>

      {/* Steam */}
      <section style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Steam</h3>
          {profile.steam_id ? (
            <button onClick={handleDisconnectSteam}
              style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', fontSize: 13 }}>
              Disconnect
            </button>
          ) : (
            <button onClick={() => setShowSteamInput(p => !p)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13 }}>
              {showSteamInput ? 'Cancel' : 'Connect'}
            </button>
          )}
        </div>
        {showSteamInput && !profile.steam_id && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input-field" value={steamInput} onChange={e => setSteamInput(e.target.value)}
              placeholder="Enter Steam ID (e.g. 7656119...)" style={{ flex: 1, fontSize: 14 }} />
            <button onClick={handleConnectSteam} disabled={!steamInput.trim()}
              style={{
                padding: '10px 16px', borderRadius: 10, border: 'none',
                background: 'var(--primary)', color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
              }}>
              Save
            </button>
          </div>
        )}
        {steamLoading && <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />}
        {steamGames.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steamGames.slice(0, 10).map(sg => {
              const matchedGame = games.find(g => sg.name.toLowerCase().includes(g.key) || g.key.includes(sg.name.toLowerCase().split(' ')[0]?.toLowerCase() || ''))
              return (
                <div key={sg.app_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 10, borderRadius: 10, background: 'var(--secondary)',
                }}>
                  {sg.logo_url ? (
                    <img src={sg.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gamepad2 size={20} /></div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{sg.name}</div>
                    <div style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{sg.playtime_hours} hours played</div>
                  </div>
                  {matchedGame && (
                    <span style={{ fontSize: 11, color: 'var(--green)', background: 'rgba(77,212,122,0.12)', padding: '2px 6px', borderRadius: 6 }}>Matched</span>
                  )}
                </div>
              )
            })}
            {steamGames.length > 10 && (
              <p style={{ color: 'var(--muted-foreground)', fontSize: 12, textAlign: 'center' }}>
                +{steamGames.length - 10} more games
              </p>
            )}
          </div>
        )}
      </section>

      {/* Games */}
      <section style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Games</h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(profile.games).map(([gk, gp]) => {
            const gi = games.find(g => g.key === gk)
            const steamInfo = steamGames.find(sg => sg.name.toLowerCase().includes(gk))
            return (
              <span key={gk} className="chip active" style={{ cursor: 'default' }}>
                {gi?.display || gk}
                {gp.rank && <span style={{ color: 'var(--gold)', marginLeft: 4 }}>{gp.rank}</span>}
                {steamInfo && <span style={{ color: 'var(--muted-foreground)', marginLeft: 4, fontSize: 11 }}>({steamInfo.playtime_hours}h)</span>}
              </span>
            )
          })}
        </div>
        {Object.entries(profile.games).map(([gk, gp]) => {
          const gi = games.find(g => g.key === gk)
          if (!Object.keys(gp.roles).length) return null
          return (
            <div key={gk} style={{ marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{gi?.display || gk} roles:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {Object.entries(gp.roles).map(([role, rank]) => (
                  <span key={role} className="badge game" style={{ fontSize: 11 }}>{role}: {rank}</span>
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </main>
  )
}
