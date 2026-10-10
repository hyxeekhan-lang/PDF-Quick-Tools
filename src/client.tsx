import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'

function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
    // The app remains fully usable when a browser or extension blocks workers.
  })
}

if (document.readyState === 'complete') {
  registerServiceWorker()
} else {
  window.addEventListener('load', registerServiceWorker, { once: true })
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
