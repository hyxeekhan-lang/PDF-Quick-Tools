import { StrictMode, startTransition } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'

// Debug: Check if TanStack Router bootstrap data exists
console.log('[DEBUG] Checking for window.$_TSR:', window.$_TSR);

function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
    // The app remains fully usable when a browser or extension blocks workers.
  })
}

// Unregister any existing service workers first to prevent caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('[DEBUG] Unregistered service worker');
    }
  });
}

if (document.readyState === 'complete') {
  registerServiceWorker()
} else {
  window.addEventListener('load', registerServiceWorker, { once: true })
}

// Workaround for missing TanStack Router bootstrap data
// If window.$_TSR is missing, we need to initialize the router differently
function initializeApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[DEBUG] Root element not found');
    return;
  }

  // Check if SSR HTML content exists
  const hasSSRContent = rootElement.children.length > 0;

  if (hasSSRContent && window.$_TSR) {
    // Normal hydration path
    console.log('[DEBUG] Hydrating with SSR content');
    startTransition(() => {
      try {
        hydrateRoot(
          rootElement,
          <StrictMode>
            <StartClient />
          </StrictMode>,
        );
        console.log('[DEBUG] Hydration successful');
      } catch (error) {
        console.error('[DEBUG] Hydration failed, falling back to client render:', error);
        renderClientOnly(rootElement);
      }
    });
  } else {
    // Client-only render (no SSR data)
    console.log('[DEBUG] Rendering client-only (no SSR data)');
    renderClientOnly(rootElement);
  }
}

function renderClientOnly(rootElement: HTMLElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
  console.log('[DEBUG] Rendered client-only');
}

// Initialize the app
initializeApp();
