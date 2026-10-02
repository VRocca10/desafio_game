import { defaultNetworkOptions, setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// MSW 3 creates default sources on import, even when setupWorker creates its own.
// The unused service-worker source awaits a worker that will never be started,
// retaining each incoming MessageEvent and its MessagePorts. Dispose only those
// unused defaults before constructing the application's active worker.
await Promise.all(defaultNetworkOptions.sources.map((source) => 'terminate' in source ? source.terminate() : undefined))
export const worker = setupWorker(...handlers)
