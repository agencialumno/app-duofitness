import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import BodyDataScreen from '../screens/onboarding/BodyDataScreen';
import LevelSelectScreen from '../screens/onboarding/LevelSelectScreen';
import MainNavigator from './MainNavigator';

const Stack = createStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="BodyData" component={BodyDataScreen} />
      <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
      <Stack.Screen name="Main" component={MainNavigator} />
    </Stack.Navigator>
  );
}
