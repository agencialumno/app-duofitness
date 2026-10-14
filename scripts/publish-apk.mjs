// Publica o APK no Vercel Blob (público): duofitness-latest.apk e duofitness-<versão>.apk.
//
// Usado só pelo workflow android.yml, e só quando o secret BLOB_READ_WRITE_TOKEN existe.
// O workflow instala @vercel/blob em uma pasta temporária (não entra no package.json do app)
// e roda este script de lá, para o import abaixo resolver.
//
// Variáveis: BLOB_READ_WRITE_TOKEN (lida pelo SDK), APK_PATH, VERSION_NAME.
// Saída (stdout): linhas "latest_url=...", "latest_download_url=...", "versioned_url=...",
// "versioned_download_url=...". O token nunca é impresso.
import { createReadStream, statSync } from 'node:fs';
import { put } from '@vercel/blob';

const apkPath = process.env.APK_PATH;
const versionName = process.env.VERSION_NAME;

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN ausente.');
  process.exit(1);
}
if (!apkPath || !versionName) {
  console.error('Defina APK_PATH e VERSION_NAME.');
  process.exit(1);
}

const size = statSync(apkPath).size;
console.error(`Enviando ${apkPath} (${(size / 1024 / 1024).toFixed(1)} MB)...`);

async function upload(pathname, cacheControlMaxAge) {
  // O stream é reaberto a cada upload (um Readable só pode ser lido uma vez).
  return put(pathname, createReadStream(apkPath), {
    access: 'public',
    addRandomSuffix: false, // nome fixo e previsível
    allowOverwrite: true, // o "latest" é sobrescrito; reexecutar a mesma tag também
    contentType: 'application/vnd.android.package-archive',
    multipart: true,
    cacheControlMaxAge,
  });
}

// "latest" com cache curto (60 s) para o link sempre apontar para o build mais novo.
const latest = await upload('duofitness-latest.apk', 60);
const versioned = await upload(`duofitness-${versionName}.apk`, 60 * 60 * 24 * 30);

console.log(`latest_url=${latest.url}`);
console.log(`latest_download_url=${latest.downloadUrl}`);
console.log(`versioned_url=${versioned.url}`);
console.log(`versioned_download_url=${versioned.downloadUrl}`);
