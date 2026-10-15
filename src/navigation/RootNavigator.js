import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingNavigator from './OnboardingNavigator';
import MainNavigator from './MainNavigator';

const Stack = createStackNavigator();

export default function RootNavigator({ isOnboarded }) {
  return (
    // As duas rotas existem sempre, para "Sair do demo" e "Resetar tudo" conseguirem voltar às
    // boas-vindas mesmo depois de o app ser reaberto já com o perfil salvo.
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isOnboarded ? 'Main' : 'Onboarding'}>
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Main" component={MainNavigator} />
    </Stack.Navigator>
  );
}
