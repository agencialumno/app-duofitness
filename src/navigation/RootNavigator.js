import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingNavigator from './OnboardingNavigator';
import MainNavigator from './MainNavigator';

const Stack = createStackNavigator();

export default function RootNavigator({ isOnboarded }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isOnboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
