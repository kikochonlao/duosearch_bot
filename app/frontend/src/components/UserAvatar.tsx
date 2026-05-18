interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  rank?: string
  style?: React.CSSProperties
}

export default function UserAvatar({ name, size = 'md', online, rank, style }: Props) {
  const dims = { sm: 36, md: 48, lg: 64, xl: 96 }
  const d = dims[size]
  const fontSize = { sm: 14, md: 20, lg: 28, xl: 40 }[size]

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <div style={{
        width: d, height: d, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        padding: 2, flexShrink: 0,
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'var(--card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize, fontWeight: 600, color: 'var(--foreground)',
          overflow: 'hidden',
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      </div>
      {online && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size === 'sm' ? 8 : 12, height: size === 'sm' ? 8 : 12,
          borderRadius: '50%', border: '2px solid var(--card)',
          background: 'var(--green)',
        }} />
      )}
      {rank && (
        <span style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          borderRadius: 8, background: 'var(--primary)',
          padding: '1px 6px', fontSize: 9, fontWeight: 600, color: '#fff',
          whiteSpace: 'nowrap',
        }}>
          {rank}
        </span>
      )}
    </div>
  )
}
