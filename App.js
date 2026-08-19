import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const val = await AsyncStorage.getItem('@duo_onboarded');
    setIsOnboarded(val === 'true');
  };

  if (isOnboarded === null) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#000000" />
          <RootNavigator isOnboarded={isOnboarded} />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
