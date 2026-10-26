import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/theme';
import { STACK_SCREEN_OPTIONS, TAB_SCENE_STYLE } from './navTheme';

import HomeScreen from '../screens/HomeScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import SmartPlanScreen from '../screens/SmartPlanScreen';
import AIPersonalTrainerScreen from '../screens/AIPersonalTrainerScreen';
import GuidedPlanScreen from '../screens/GuidedPlanScreen';
import EditBodyDataScreen from '../screens/EditBodyDataScreen';
import StoreScreen from '../screens/StoreScreen';
import StoreDetailScreen from '../screens/StoreDetailScreen';
import GymNowScreen from '../screens/GymNowScreen';
import HealthScreen from '../screens/HealthScreen';
import HealthCategoryScreen from '../screens/HealthCategoryScreen';
import HealthConnectScreen from '../screens/HealthConnectScreen';
import AdvertiseScreen from '../screens/AdvertiseScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const WorkoutStack = createStackNavigator();
const ExerciseStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// A aba Início é uma pilha: a Home e a vitrine (marketplace e o detalhe do item; as rotas seguem com os nomes internos Loja e LojaDetalhe). Fica DENTRO do MainNavigator
// para existir também no Modo Demo, onde as abas moram dentro do OnboardingNavigator.
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Loja" component={StoreScreen} />
      <HomeStack.Screen name="LojaDetalhe" component={StoreDetailScreen} />
      <HomeStack.Screen name="AcademiaAgora" component={GymNowScreen} />
      <HomeStack.Screen name="Saude" component={HealthScreen} />
      <HomeStack.Screen name="SaudeDetalhe" component={HealthCategoryScreen} />
      <HomeStack.Screen name="SaudeConectar" component={HealthConnectScreen} />
      <HomeStack.Screen name="AnunciarMarketplace" component={AdvertiseScreen} />
    </HomeStack.Navigator>
  );
}

function WorkoutStackNav() {
  return (
    <WorkoutStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <WorkoutStack.Screen name="WorkoutsList" component={WorkoutsScreen} />
      <WorkoutStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <WorkoutStack.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
      <WorkoutStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <WorkoutStack.Screen name="SmartPlan" component={SmartPlanScreen} />
      {/* Os atalhos "Personal Trainer IA" abrem a série guiada; o chat antigo fica na rota alternativa. */}
      <WorkoutStack.Screen name="AIPersonalTrainer" component={GuidedPlanScreen} />
      <WorkoutStack.Screen name="AIPersonalTrainerChat" component={AIPersonalTrainerScreen} />
    </WorkoutStack.Navigator>
  );
}

function ExerciseStackNav() {
  return (
    <ExerciseStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <ExerciseStack.Screen name="ExercisesList" component={ExercisesScreen} />
      <ExerciseStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
    </ExerciseStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditBodyData" component={EditBodyDataScreen} />
    </ProfileStack.Navigator>
  );
}

export default function MainNavigator() {
  // A barra de abas respeita a área segura: barra de navegação do Android (edge-to-edge) e
  // indicador home do iPhone.
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      sceneContainerStyle={TAB_SCENE_STYLE}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0F0F',
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#555555',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Workouts') iconName = focused ? 'barbell' : 'barbell-outline';
          else if (route.name === 'Exercises') iconName = focused ? 'fitness' : 'fitness-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNav} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Workouts" component={WorkoutStackNav} options={{ tabBarLabel: 'Treinos' }} />
      <Tab.Screen name="Exercises" component={ExerciseStackNav} options={{ tabBarLabel: 'Exercícios' }} />
      <Tab.Screen name="Profile" component={ProfileStackNav} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
