import { http, HttpResponse } from 'msw'
// Infrastructure check only. Ranking and history handlers will be added next.
export const handlers = [
  http.get('/api/status', () => HttpResponse.json({ status: 'ready' })),
]
