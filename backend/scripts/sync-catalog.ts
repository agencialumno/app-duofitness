// Gera src/ia/catalog.ts a partir do app (ver render-catalog.ts).
//
//   npm run sync-catalog     reescreve o catalog.ts
//   npm run check-catalog    falha (exit 1) se o catalog.ts estiver desatualizado
import { readFileSync, writeFileSync } from 'node:fs';
import { CATALOG_PATH, renderCatalog } from './render-catalog.js';

const expected = renderCatalog();

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(CATALOG_PATH, 'utf8');
  } catch {
    // arquivo ausente conta como desatualizado
  }
  if (current.replace(/\r\n/g, '\n') !== expected) {
    console.error('src/ia/catalog.ts está desatualizado em relação ao app. Rode: npm run sync-catalog');
    process.exit(1);
  }
  console.log('catalog.ts está em dia com o app.');
} else {
  writeFileSync(CATALOG_PATH, expected, 'utf8');
  console.log(`catalog.ts gerado: ${CATALOG_PATH}`);
}
