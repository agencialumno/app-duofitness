import { fileURLToPath } from 'node:url';
import { transformWithOxc } from 'vite';
import { defineConfig } from 'vitest/config';

const stub = (f: string) => fileURLToPath(new URL(`./test/stubs/${f}`, import.meta.url));

export default defineConfig({
  // Componentes do app (src/components/*.js) têm JSX em arquivos .js: este plugin os transforma (classic, com
  // React.createElement) antes da análise de imports, só nos testes de componentes.
  plugins: [
    {
      name: 'jsx-em-js-do-app',
      enforce: 'pre',
      async transform(code: string, id: string) {
        if (!/[\/]src[\/]components[\/][^\/]+\.js$/.test(id)) return null;
        const r = await transformWithOxc(code, id.replace(/\.js$/, '.jsx'), {
          jsx: { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' },
        });
        return { code: r.code, map: r.map };
      },
    },
  ],
  // Stubs só para os módulos de React Native que o backend não tem (usados por testes de componentes).
  resolve: {
    alias: {
      '@react-navigation/native': stub('navigation.ts'),
      '@expo/vector-icons': stub('vector-icons.ts'),
      'expo-video': stub('expo-video.ts'),
      'react-native-safe-area-context': stub('safe-area.ts'),
      '@react-native-async-storage/async-storage': stub('async-storage.ts'),
      'react-native': stub('react-native.ts'),
      react: stub('react.ts'),
    },
  },
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
