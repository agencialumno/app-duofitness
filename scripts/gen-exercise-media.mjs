// Gera src/data/exerciseVideos.js a partir dos arquivos em assets/exercicios/ e atualiza a lista de
// gravação em docs/videos-exercicios.md. Uso:  npm run gen:media
//
// O Metro exige require() estático, então o mapa é GERADO: só entram arquivos que existem, e o
// bundle nunca quebra por arquivo ausente. Rode de novo sempre que adicionar, trocar ou remover
// um vídeo ou capa (scripts/check-videos.mjs confere se o mapa está em dia).
//
// Para a lista de gravação, este script carrega workoutGenerator.js com o Babel do projeto (devDependency
// já presente via Expo): é a única parte que precisa de node_modules.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { collectEntries, MAP_FILE, renderMap } from './lib/media.mjs';
import { buildRecordingRows, renderRecordingList, replaceList } from './lib/recording-list.mjs';

const root = process.argv.includes('--root') ? path.resolve(process.argv[process.argv.indexOf('--root') + 1]) : process.cwd();
const require = createRequire(path.join(root, 'package.json'));

// 1) mapa
const entries = collectEntries(root);
writeFileSync(path.join(root, MAP_FILE), renderMap(entries));
console.log(`${MAP_FILE}: ${entries.length} exercício(s) com mídia.`);

// 2) lista de gravação (docs)
function loadModule(file, cache = new Map()) {
  const babel = require('@babel/core');
  const full = file.endsWith('.js') ? file : `${file}.js`;
  if (cache.has(full)) return cache.get(full).exports;
  const { code } = babel.transformFileSync(full, {
    babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const mod = { exports: {} };
  cache.set(full, mod);
  const localRequire = (spec) => (spec.startsWith('.') ? loadModule(path.resolve(path.dirname(full), spec), cache) : require(spec));
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
  return mod.exports;
}

const docPath = path.join(root, 'docs/videos-exercicios.md');
if (existsSync(docPath)) {
  const gen = loadModule(path.join(root, 'src/utils/workoutGenerator.js'));
  const { COMBOS } = loadModule(path.join(root, 'src/data/combosEquipment.js'));
  const rows = buildRecordingRows({ EXERCISE_DB: gen.EXERCISE_DB, generateWorkoutPlan: gen.generateWorkoutPlan, COMBOS });
  const have = new Set(entries.filter((e) => e.video && e.poster).map((e) => e.id));
  const doc = readFileSync(docPath, 'utf8');
  writeFileSync(docPath, replaceList(doc, renderRecordingList(rows, have)));
  console.log(`docs/videos-exercicios.md: lista de gravação com ${rows.length} exercício(s).`);
}
