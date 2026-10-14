// Entrada da Vercel Function (Hono com zero-config: export default do app).
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createStore } from './lib/store.js';

const config = loadConfig();
const store = createStore(config.upstash, { isProduction: config.isProduction });

export default createApp({ config, store });
