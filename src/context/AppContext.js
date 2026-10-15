import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFreshDemoData } from '../data/demoData';
import { canOfferDemo, clearAllDuoData, restartDemoData, writeDemoData } from '../utils/demoSession';
import { readAppData } from '../utils/safeStorage';

const AppContext = createContext({});

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState([]);
  // Sobe a cada reinício/limpeza dos dados; telas com cache próprio (ex.: Saúde) recarregam.
  const [dataEpoch, setDataEpoch] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Cada chave é lida e validada sozinha: valor corrompido (JSON quebrado, tipo errado) é tratado como
    // ausente, sem derrubar o app e sem apagar nenhuma chave (nem as outras, nem a corrompida).
    try {
      const d = await readAppData(AsyncStorage);
      if (d.user !== undefined) setUser(d.user);
      if (d.workouts !== undefined) setWorkouts(d.workouts);
      if (d.sessions !== undefined) setCompletedSessions(d.sessions);
      if (d.xp !== undefined) setXp(d.xp);
      if (d.streak !== undefined) setStreak(d.streak);
      if (d.achievements !== undefined) setAchievements(d.achievements);
    } catch (e) {
      console.log('Erro ao carregar dados:', e);
    }
  };

  const saveUser = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('@duo_user', JSON.stringify(userData));
    await AsyncStorage.setItem('@duo_onboarded', 'true');
  };

  const addWorkout = async (workout) => {
    const updated = [...workouts, { ...workout, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    setWorkouts(updated);
    await AsyncStorage.setItem('@duo_workouts', JSON.stringify(updated));
  };

  // Adiciona várias séries de uma vez (ex: A, B, C geradas juntas).
  // Use esta função em vez de chamar addWorkout em loop — chamadas em
  // sequência rápida leem o mesmo estado antigo e uma sobrescreve a
  // outra, fazendo só a última série sobreviver.
  const addWorkouts = async (newWorkouts) => {
    const withMeta = newWorkouts.map((w, i) => ({
      ...w,
      id: `${Date.now()}_${i}`,
      createdAt: new Date().toISOString(),
    }));
    const updated = [...workouts, ...withMeta];
    setWorkouts(updated);
    await AsyncStorage.setItem('@duo_workouts', JSON.stringify(updated));
  };


  const updateWorkout = async (id, data) => {
    const updated = workouts.map(w => w.id === id ? { ...w, ...data } : w);
    setWorkouts(updated);
    await AsyncStorage.setItem('@duo_workouts', JSON.stringify(updated));
  };

  const deleteWorkout = async (id) => {
    const updated = workouts.filter(w => w.id !== id);
    setWorkouts(updated);
    await AsyncStorage.setItem('@duo_workouts', JSON.stringify(updated));
  };

  const completeSession = async (workoutId) => {
    const session = {
      id: Date.now().toString(),
      workoutId,
      completedAt: new Date().toISOString(),
      xpEarned: 50,
    };
    const updatedSessions = [...completedSessions, session];
    setCompletedSessions(updatedSessions);
    await AsyncStorage.setItem('@duo_sessions', JSON.stringify(updatedSessions));

    // XP + streak
    const newXp = xp + 50;
    setXp(newXp);
    await AsyncStorage.setItem('@duo_xp', newXp.toString());

    const newStreak = streak + 1;
    setStreak(newStreak);
    await AsyncStorage.setItem('@duo_streak', newStreak.toString());

    checkAchievements(updatedSessions, newXp, newStreak);
    return session;
  };

  const checkAchievements = async (sessions, currentXp, currentStreak) => {
    const newAchs = [...achievements];
    let changed = false;

    const unlock = (id, title, icon) => {
      if (!newAchs.find(a => a.id === id)) {
        newAchs.push({ id, title, icon, unlockedAt: new Date().toISOString() });
        changed = true;
      }
    };

    if (sessions.length >= 1) unlock('first_workout', 'Primeira série!', '🏆');
    if (sessions.length >= 7) unlock('week_warrior', 'Guerreiro da semana', '🔥');
    if (sessions.length >= 30) unlock('monthly_beast', 'Besta mensal', '💪');
    if (currentStreak >= 3) unlock('streak_3', '3 dias seguidos', '⚡');
    if (currentStreak >= 7) unlock('streak_7', 'Semana perfeita', '🌟');
    if (currentXp >= 500) unlock('xp_500', '500 XP acumulado', '🎯');
    if (currentXp >= 1000) unlock('xp_1000', 'Mestre do XP', '👑');

    if (changed) {
      setAchievements(newAchs);
      await AsyncStorage.setItem('@duo_achievements', JSON.stringify(newAchs));
    }
  };

  const applyData = (d) => {
    setUser(d.user);
    setWorkouts(d.workouts);
    setCompletedSessions(d.sessions);
    setXp(d.xp);
    setStreak(d.streak);
    setAchievements(d.achievements);
    setDataEpoch((n) => n + 1);
  };

  // Carrega os dados de exemplo. Recusa (devolve false) se houver perfil real salvo: o demo nunca
  // sobrescreve dados de verdade.
  const loadDemoData = async () => {
    const stored = await AsyncStorage.getItem('@duo_user');
    if (!canOfferDemo(stored)) return false;
    const data = getFreshDemoData();
    applyData(data);
    await writeDemoData(AsyncStorage, data);
    return true;
  };

  // "Reiniciar demo": apaga o que existe e recarrega os dados de exemplo com as datas de hoje.
  const restartDemo = async () => {
    const data = getFreshDemoData();
    const ok = await restartDemoData(AsyncStorage, data);
    if (ok) applyData(data);
    return ok;
  };

  // Apaga TODAS as chaves @duo_* e zera o estado em memória (usado por "Sair" do demo e "Resetar tudo").
  const resetAll = async () => {
    await clearAllDuoData(AsyncStorage);
    setUser(null);
    setWorkouts([]);
    setCompletedSessions([]);
    setXp(0);
    setStreak(0);
    setAchievements([]);
    setDataEpoch((n) => n + 1);
  };

  const getLevel = () => {
    if (xp < 100) return { level: 1, title: 'Iniciante', nextXp: 100 };
    if (xp < 300) return { level: 2, title: 'Ativo', nextXp: 300 };
    if (xp < 600) return { level: 3, title: 'Dedicado', nextXp: 600 };
    if (xp < 1000) return { level: 4, title: 'Avançado', nextXp: 1000 };
    if (xp < 2000) return { level: 5, title: 'Elite', nextXp: 2000 };
    return { level: 6, title: 'Lenda', nextXp: null };
  };

  return (
    <AppContext.Provider value={{
      user, saveUser,
      workouts, addWorkout, addWorkouts, updateWorkout, deleteWorkout,
      completedSessions, completeSession,
            xp, streak, achievements,
      getLevel,
      refreshData: loadData,
      loadDemoData, restartDemo, resetAll, dataEpoch,
    }}>
      {children}
    </AppContext.Provider>
  );
};
