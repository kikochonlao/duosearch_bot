import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initTheme } from './styles/theme'
import './styles/global.css'
import App from './App'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: { user?: { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string } }
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          onClick: (cb: () => void) => void
        }
        HapticFeedback: { impactOccurred: (style: string) => void }
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
          secondary_bg_color?: string
        }
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        requestFullscreen: () => void
        safeAreaInset: { top: number; bottom: number; left: number; right: number }
        onEvent: (event: string, cb: (...args: any[]) => void) => void
        offEvent: (event: string, cb: (...args: any[]) => void) => void
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (cb: () => void) => void
          offClick: (cb: () => void) => void
        }
        colorScheme: string
      }
    }
  }
}

initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
