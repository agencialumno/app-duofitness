// Servidor local (npm run dev). Em produção a Vercel usa src/index.ts direto.
import { serve } from '@hono/node-server';
import app from './index.js';

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Duo Fitness backend em http://localhost:${info.port}`);
});
