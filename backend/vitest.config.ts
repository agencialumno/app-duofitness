import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Vários testes executam scripts do repositório (bash, openssl, keytool) como processo externo.
    // No Windows, com antivírus e vários arquivos em paralelo, o primeiro processo chega a levar
    // 10 a 15 s: o padrão de 5 s dava timeout intermitente. Prazo maior e menos arquivos ao mesmo tempo.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    maxWorkers: 4,
  },
});
