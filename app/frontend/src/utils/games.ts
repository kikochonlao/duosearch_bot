export const GAME_GRADIENTS: Record<string, string> = {
  cs2: 'linear-gradient(135deg, #f59e0b, #d97706)',
  dota2: 'linear-gradient(135deg, #22c55e, #166534)',
  valorant: 'linear-gradient(135deg, #ef4444, #991b1b)',
  overwatch: 'linear-gradient(135deg, #f97316, #ea580c)',
  apex: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
  lol: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
  fortnite: 'linear-gradient(135deg, #a855f7, #6b21a8)',
  rocket_league: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  pubg: 'linear-gradient(135deg, #eab308, #854d0e)',
}

export function getGameLogoUrl(key: string): string {
  return `/games/${key}.svg`
}

export function getGameGradient(key: string): string {
  return GAME_GRADIENTS[key] || 'linear-gradient(135deg, var(--primary), var(--pink))'
}
