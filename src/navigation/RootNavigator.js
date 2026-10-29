import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useApp } from '../context/AppContext';
import OnboardingNavigator from './OnboardingNavigator';
import MainNavigator from './MainNavigator';
import { STACK_SCREEN_OPTIONS } from './navTheme';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AgeGateScreen from '../screens/auth/AgeGateScreen';

const AuthStack = createStackNavigator();
const AgeStack = createStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AgeNavigator() {
  return (
    <AgeStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <AgeStack.Screen name="AgeGate" component={AgeGateScreen} />
    </AgeStack.Navigator>
  );
}

// O app só entra com conta. O portão (AppContext.gate) decide, pelo estado, qual árvore aparece:
//   auth (boas-vindas, criar conta, entrar) -> age (etapa de idade) -> onboarding (perfil) -> main.
// Sair da conta, excluir a conta e a recusa por idade só mudam o estado: a troca de árvore é automática, sem navigation.reset.
// Enquanto vincula os dados da conta (ou sai), devolve null (tela de carregamento).
export default function RootNavigator() {
  const { gate } = useApp();
  if (gate === 'loading') return null;
  if (gate === 'auth') return <AuthNavigator />;
  if (gate === 'age') return <AgeNavigator />;
  if (gate === 'onboarding') return <OnboardingNavigator />;
  return <MainNavigator />;
}
