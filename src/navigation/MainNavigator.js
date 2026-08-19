import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

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
import EditBodyDataScreen from '../screens/EditBodyDataScreen';

const Tab = createBottomTabNavigator();
const WorkoutStack = createStackNavigator();
const ExerciseStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function WorkoutStackNav() {
  return (
    <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutStack.Screen name="WorkoutsList" component={WorkoutsScreen} />
      <WorkoutStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <WorkoutStack.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
      <WorkoutStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <WorkoutStack.Screen name="SmartPlan" component={SmartPlanScreen} />
      <WorkoutStack.Screen name="AIPersonalTrainer" component={AIPersonalTrainerScreen} />
    </WorkoutStack.Navigator>
  );
}

function ExerciseStackNav() {
  return (
    <ExerciseStack.Navigator screenOptions={{ headerShown: false }}>
      <ExerciseStack.Screen name="ExercisesList" component={ExercisesScreen} />
      <ExerciseStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
    </ExerciseStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditBodyData" component={EditBodyDataScreen} />
    </ProfileStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0F0F',
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Workouts" component={WorkoutStackNav} options={{ tabBarLabel: 'Treinos' }} />
      <Tab.Screen name="Exercises" component={ExerciseStackNav} options={{ tabBarLabel: 'Exercícios' }} />
      <Tab.Screen name="Profile" component={ProfileStackNav} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
