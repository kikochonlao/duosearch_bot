export function initTheme() {
  const tg = window.Telegram?.WebApp
  tg?.ready()
  tg?.expand()

  const setVar = (name: string, value?: string) => {
    if (value) document.documentElement.style.setProperty(name, value)
  }

  setVar('--tg-bg', tg?.themeParams?.bg_color)
  setVar('--tg-text', tg?.themeParams?.text_color)
  setVar('--tg-hint', tg?.themeParams?.hint_color)
  setVar('--tg-link', tg?.themeParams?.link_color)
  setVar('--tg-button', tg?.themeParams?.button_color)
  setVar('--tg-button-text', tg?.themeParams?.button_text_color)
  setVar('--tg-secondary-bg', tg?.themeParams?.secondary_bg_color)

  tg?.setHeaderColor?.('bg_color' as any)
  tg?.setBackgroundColor?.('bg_color' as any)
}

export function getTheme() {
  const tg = window.Telegram?.WebApp
  return {
    bg: tg?.themeParams?.bg_color || '#17212b',
    text: tg?.themeParams?.text_color || '#ffffff',
    hint: tg?.themeParams?.hint_color || '#8e9eab',
    button: tg?.themeParams?.button_color || '#2ea6ff',
    buttonText: tg?.themeParams?.button_text_color || '#ffffff',
    secondaryBg: tg?.themeParams?.secondary_bg_color || '#1f2a36',
  }
}
