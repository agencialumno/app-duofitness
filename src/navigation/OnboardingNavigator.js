import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import BodyDataScreen from '../screens/onboarding/BodyDataScreen';
import LevelSelectScreen from '../screens/onboarding/LevelSelectScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import MainNavigator from './MainNavigator';
import { STACK_SCREEN_OPTIONS } from './navTheme';

const Stack = createStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="BodyData" component={BodyDataScreen} />
      <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
      <Stack.Screen name="Main" component={MainNavigator} />
    </Stack.Navigator>
  );
}
