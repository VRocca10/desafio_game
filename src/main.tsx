import { createRoot } from 'react-dom/client'
import { AppProviders } from '@/app/providers/AppProviders'
import '@/app/styles.css'
import App from '@/app/App'

async function bootstrap() {
  try {

    const { worker } = await import('@/app/mocks/browser')
    await worker.start({
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      onUnhandledFrame: 'bypass',
    })
  } catch (error) {
    console.error('Mock API initialization failed', error)
  }
  createRoot(document.getElementById('root')!).render(
    <AppProviders><App /></AppProviders>,
  )
}
void bootstrap()
