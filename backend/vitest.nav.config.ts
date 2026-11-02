import { defineConfig } from 'vitest/config';

// Testes de navegação com NAVEGADORES REAIS (@react-navigation/core com StackRouter e TabRouter e um renderizador de React de verdade). Ficam numa configuração
// à parte porque a configuração principal troca react e react-native por stubs. Aqui NÃO há aliases: react vem do node_modules da raiz do app.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test-nav/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
