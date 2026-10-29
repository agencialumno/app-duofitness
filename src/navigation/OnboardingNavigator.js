import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import BodyDataScreen from '../screens/onboarding/BodyDataScreen';
import LevelSelectScreen from '../screens/onboarding/LevelSelectScreen';
import { STACK_SCREEN_OPTIONS } from './navTheme';

const Stack = createStackNavigator();

// Perfil (nome e objetivos) -> medidas (a idade já vem da etapa de idade da conta) -> nível. Ao salvar o perfil o portão do app
// passa para o Main sozinho.
export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="BodyData" component={BodyDataScreen} />
      <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
    </Stack.Navigator>
  );
}
