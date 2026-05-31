const tg = window.Telegram?.WebApp

export function tgAlert(message: string): Promise<void> {
  return new Promise(resolve => {
    if (tg?.showAlert) {
      tg.showAlert(message, resolve)
    } else {
      alert(message)
      resolve()
    }
  })
}

export function tgConfirm(message: string): Promise<boolean> {
  return new Promise(resolve => {
    if (tg?.showConfirm) {
      tg.showConfirm(message, resolve)
    } else {
      resolve(confirm(message))
    }
  })
}

export function tgPrompt(message: string): Promise<string | null> {
  return new Promise(resolve => {
    if (tg?.showPopup) {
      tg.showPopup({
        title: message,
        message: '',
        buttons: [
          { type: 'cancel', text: 'Cancel' },
          { type: 'default', text: 'OK', id: 'ok' },
        ],
      }, (buttonId) => {
        resolve(buttonId === 'ok' ? '' : null)
      })
    } else {
      resolve(prompt(message))
    }
  })
}
