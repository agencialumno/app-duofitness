import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readAppData, readJsonKey } from '../utils/safeStorage';
import { evaluateAchievements } from '../utils/achievements';
import { sanitizeAgeInfo } from '../utils/accountAge';
import { bindAccount } from '../utils/accountSnapshot';
import { decideGate, deleteAccountFlow, rejectUnderageFlow, signOutFlow } from '../utils/accountFlow';
import { useAuth } from '../auth/AuthContext';

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
  // Idade da conta (etapa de idade): { age, ageGroup, guardianConfirmed } ou null. Só no aparelho (@duo_age).
  const [ageInfo, setAgeInfo] = useState(null);
  // Conta ativa: os dados do aparelho só são lidos DEPOIS de vinculados ao uid (restaurar, adotar ou começar do zero).
  const { ready: authReady, user: authUser, provider } = useAuth();
  const authUid = authUser ? authUser.uid : null;
  const [bound, setBound] = useState({ uid: undefined, status: 'binding' });

  useEffect(() => {
    if (!authReady) return undefined;
    let alive = true;
    (async () => {
      setBound({ uid: authUid, status: 'binding' });
      try {
        if (authUid) await bindAccount(AsyncStorage, authUid);
      } catch (e) {
        console.log('Erro ao vincular a conta aos dados do aparelho:', e);
      }
      await loadData();
      if (alive) setBound({ uid: authUid, status: 'ready' });
    })();
    return () => { alive = false; };
  }, [authReady, authUid]);

  const loadData = async () => {
    // Cada chave é lida e validada sozinha: valor corrompido (JSON quebrado, tipo errado) é tratado como
    // ausente, sem derrubar o app e sem apagar nenhuma chave (nem as outras, nem a corrompida).
    try {
      const d = await readAppData(AsyncStorage);
      const age = await readJsonKey(AsyncStorage, '@duo_age', sanitizeAgeInfo);
      // chave ausente = valor vazio (ao trocar de conta nada do estado anterior pode ficar na memória)
      setUser(d.user !== undefined ? d.user : null);
      setWorkouts(d.workouts !== undefined ? d.workouts : []);
      setCompletedSessions(d.sessions !== undefined ? d.sessions : []);
      setXp(d.xp !== undefined ? d.xp : 0);
      setStreak(d.streak !== undefined ? d.streak : 0);
      setAchievements(d.achievements !== undefined ? d.achievements : []);
      setAgeInfo(age !== undefined ? age : null);
      setDataEpoch((n) => n + 1);
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

    checkAchievements(updatedSessions, newXp);
    return session;
  };

  // "3 dias seguidos" e "Semana perfeita" usam a sequência por datas (ver utils/achievements.js);
  // o contador @duo_streak segue gravado, mas não decide mais conquistas.
  const checkAchievements = async (sessions, currentXp) => {
    const { list, changed } = evaluateAchievements({ current: achievements, sessions, xp: currentXp });
    if (changed) {
      setAchievements(list);
      await AsyncStorage.setItem('@duo_achievements', JSON.stringify(list));
    }
  };

  const resetMemory = () => {
    setUser(null);
    setWorkouts([]);
    setCompletedSessions([]);
    setXp(0);
    setStreak(0);
    setAchievements([]);
    setAgeInfo(null);
    setDataEpoch((n) => n + 1);
  };

  // Etapa de idade concluída: grava só no aparelho (entra no snapshot da conta). Se já existe perfil (dados de antes das contas),
  // a faixa etária do perfil passa a ser a da idade informada.
  const saveAge = async (info) => {
    await AsyncStorage.setItem('@duo_age', JSON.stringify(info));
    setAgeInfo(info);
    if (user && user.ageGroup !== info.ageGroup) {
      const next = { ...user, ageGroup: info.ageGroup };
      setUser(next);
      await AsyncStorage.setItem('@duo_user', JSON.stringify(next));
    }
  };

  // "Sair da conta": salva o snapshot das @duo_* desta conta, limpa as ativas, zera a memória e só então sai.
  // Enquanto isso o portão mostra a tela de carregamento (sem piscar etapas de outra conta).
  const signOutAccount = async () => {
    setBound({ uid: null, status: 'signingout' });
    try {
      await signOutFlow({ storage: AsyncStorage, provider, uid: authUid });
      resetMemory();
    } catch (e) {
      // não saiu: volta a vincular a conta ativa e mostra os dados de novo
      try { if (authUid) await bindAccount(AsyncStorage, authUid); } catch (e2) { /* segue */ }
      await loadData();
      setBound({ uid: authUid, status: 'ready' });
      throw e;
    }
  };

  // "Excluir minha conta": reautentica e apaga a conta online (provedor), depois apaga o snapshot do uid e os dados ativos.
  const deleteAccountAndData = async ({ password } = {}) => {
    await deleteAccountFlow({ storage: AsyncStorage, provider, uid: authUid, password });
    resetMemory();
  };

  // Etapa de idade recusou a pessoa (abaixo da idade mínima): exclui a conta recém-criada (sem reautenticar; se falhar, apenas
  // sai) e apaga qualquer dado local. Nada da pessoa é guardado.
  const rejectUnderage = async () => {
    setBound({ uid: null, status: 'signingout' });
    await rejectUnderageFlow({ storage: AsyncStorage, provider, uid: authUid });
    resetMemory();
  };

  const getLevel = () => {
    if (xp < 100) return { level: 1, title: 'Iniciante', nextXp: 100 };
    if (xp < 300) return { level: 2, title: 'Ativo', nextXp: 300 };
    if (xp < 600) return { level: 3, title: 'Dedicado', nextXp: 600 };
    if (xp < 1000) return { level: 4, title: 'Avançado', nextXp: 1000 };
    if (xp < 2000) return { level: 5, title: 'Elite', nextXp: 2000 };
    return { level: 6, title: 'Lenda', nextXp: null };
  };

  // Portão do app: 'loading' | 'auth' (sem conta) | 'age' (etapa de idade) | 'onboarding' | 'main'.
  const gate = decideGate({ authReady, bound, authUid, ageInfo, user });

  return (
    <AppContext.Provider value={{
      user, saveUser,
      workouts, addWorkout, addWorkouts, updateWorkout, deleteWorkout,
      completedSessions, completeSession,
            xp, streak, achievements,
      getLevel,
      refreshData: loadData,
      ageInfo, saveAge, signOutAccount, deleteAccountAndData, rejectUnderage, dataEpoch,
      gate,
    }}>
      {children}
    </AppContext.Provider>
  );
};
