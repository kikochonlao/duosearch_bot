const tg = (window as any).Telegram?.WebApp

export function impact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') {
  tg?.HapticFeedback?.impactOccurred(style)
}

export function notification(type: 'success' | 'error' | 'warning' = 'success') {
  tg?.HapticFeedback?.notificationOccurred(type)
}

export function selectionChanged() {
  tg?.HapticFeedback?.selectionChanged()
}
