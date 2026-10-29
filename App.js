import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { AuthStateProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { NAV_COLORS } from './src/navigation/navTheme';
import ErrorBoundary from './src/components/ErrorBoundary';
import { createForcedError } from './src/utils/errorTestFlag';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

// Tema ESCURO da navegação (partindo do DarkTheme): sem ele o React Navigation usa o tema claro e as telas sem fundo próprio
// aparecem brancas. Ver src/navigation/navTheme.js.
const APP_NAV_THEME = { ...DarkTheme, colors: { ...DarkTheme.colors, ...NAV_COLORS } };

// Flag de TESTE (só na web, pela URL; nunca liga em iOS/Android): provoca um erro de render para o smoke
// test conferir a tela de recuperação. Ver src/utils/errorTestFlag.js.
const forced = createForcedError(Platform.OS, typeof window !== 'undefined' && window.location ? window.location.search : '');

function ForceRenderError() {
  if (forced.shouldThrow()) throw new Error('Erro de teste forçado (duoForceError)');
  return null;
}

function AppRoot() {
  // Pré-carrega a fonte dos ícones antes de renderizar. Se falhar, registra o erro e
  // segue renderizando o app mesmo assim (sem travar).
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontError) console.error('Falha ao carregar a fonte dos ícones:', fontError);
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  // O RootNavigator escolhe a tela pelo estado da conta (conta -> idade -> perfil -> app), ver AppContext.gate.
  return (
    <AuthStateProvider>
      <AppProvider>
        <NavigationContainer theme={APP_NAV_THEME}>
          <StatusBar style="light" backgroundColor="#000000" />
          <RootNavigator />
        </NavigationContainer>
      </AppProvider>
    </AuthStateProvider>
  );
}

export default function App() {
  // "Recomeçar do zero" (na tela de recuperação) limpa as chaves @duo_* e remonta o app, que relê o
  // armazenamento já vazio e cai nas boas-vindas.
  const [appKey, setAppKey] = useState(0);
  const handleReset = useCallback(() => setAppKey((k) => k + 1), []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary onReset={handleReset} onError={() => forced.consume()}>
        <ForceRenderError />
        <AppRoot key={appKey} />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
