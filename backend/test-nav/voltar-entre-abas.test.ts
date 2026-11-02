// Voltar entre abas, com NAVEGADORES REAIS: StackRouter e TabRouter de verdade (@react-navigation/core) dentro de um container e renderizados por
// react-test-renderer, com a mesma estrutura de MainNavigator (4 abas, cada uma com a sua pilha). A navegação entre abas usa o MESMO openInTab do app e as
// telas de destino usam o MESMO useReturnToOrigin. Só as telas visuais (React Native) são substituídas por telas de teste.
// @ts-nocheck
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { BaseNavigationContainer, CommonActions, StackActions, StackRouter, TabRouter, createNavigatorFactory, useNavigationBuilder } from '@react-navigation/core';
import { describe, expect, it } from 'vitest';
import useReturnToOrigin, { shouldIntercept } from '../../src/navigation/useReturnToOrigin.js';
import { openInTab } from '../../src/navigation/crossTab.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');

// ---------- navegadores de teste (routers reais, visual mínimo) ----------
function StackView({ initialRouteName, children }: any) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, { children, initialRouteName });
  return React.createElement(NavigationContent, null, state.routes.map((r: any) => React.createElement(React.Fragment, { key: r.key }, descriptors[r.key].render())));
}
function TabView({ initialRouteName, children }: any) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(TabRouter, { children, initialRouteName }); // backBehavior padrão, como no app
  // lazy (padrão do bottom-tabs): a aba só é renderizada, e a pilha dela só nasce, depois da primeira visita; depois fica montada
  const visited = React.useRef(new Set<string>());
  visited.current.add(state.routes[state.index].key);
  return React.createElement(NavigationContent, null, state.routes.filter((r: any) => visited.current.has(r.key)).map((r: any) => React.createElement(React.Fragment, { key: r.key }, descriptors[r.key].render())));
}
const Stack = createNavigatorFactory(StackView)();
const Tabs = createNavigatorFactory(TabView)();

// Telas de teste: guardam a instância (para provar que a tela de origem NÃO foi recriada) e um contador local (estado que precisa sobreviver, como rolagem e filtros)
const store: Record<string, any> = {};
let seq = 0;
function makeScreen(name: string, withHook: boolean) {
  return function Screen({ navigation, route }: any) {
    if (withHook) useReturnToOrigin(navigation, route);
    const [id] = React.useState(() => ++seq);
    const [count, setCount] = React.useState(0);
    store[name] = { id, count, setCount, navigation, route };
    return null;
  };
}

// Mesma estrutura de MainNavigator.js. withHook = telas que chamam useReturnToOrigin no app.
const STACKS: Record<string, [string, boolean][]> = {
  Home: [['HomeMain', false], ['Loja', false]],
  Workouts: [['WorkoutsList', false], ['WorkoutDetail', true], ['CreateWorkout', true], ['ActiveWorkout', false], ['SmartPlan', true], ['AIPersonalTrainer', true]],
  Exercises: [['ExercisesList', false], ['ExerciseDetail', true]],
  Profile: [['ProfileMain', false]],
};
const SCREENS: Record<string, any> = {};
for (const list of Object.values(STACKS)) for (const [n, h] of list) SCREENS[n] = makeScreen(n, h);
const STACK_COMPONENTS: Record<string, any> = {};
for (const tab of Object.keys(STACKS)) STACK_COMPONENTS[tab] = () => React.createElement(Stack.Navigator, null, ...STACKS[tab]!.map(([n]) => React.createElement(Stack.Screen, { key: n, name: n, component: SCREENS[n] })));
const Root = () => React.createElement(Tabs.Navigator, { initialRouteName: 'Home' }, ...['Home', 'Workouts', 'Exercises', 'Profile'].map((t) => React.createElement(Tabs.Screen, { key: t, name: t, component: STACK_COMPONENTS[t] })));

async function setup() {
  for (const k of Object.keys(store)) delete store[k];
  const ref = React.createRef<any>();
  let r: any;
  await TestRenderer.act(async () => { r = TestRenderer.create(React.createElement(BaseNavigationContainer, { ref }, React.createElement(Root))); });
  const act = async (fn: () => void) => { await TestRenderer.act(async () => { fn(); }); };
  const root = () => ref.current.getRootState();
  const tabRoute = () => root().routes[root().index];
  const tabName = () => tabRoute().name;
  const stackOf = (tab: string) => root().routes.find((x: any) => x.name === tab)?.state; // undefined = pilha ainda não criada
  const names = (tab: string) => (stackOf(tab)?.routes ?? []).map((x: any) => x.name);
  const top = () => { const s = tabRoute().state; return s ? s.routes[s.index].name : null; };
  return { ref, act, tabName, names, top, stackOf, unmount: () => r.unmount() };
}

// três formas de voltar: cabeçalho (goBack da tela), hardware back do Android (container) e gesto de voltar (pop da pilha, como o gesto do iOS/Android)
const BACKS = {
  cabecalho: (h: any, screen: string) => h.act(() => store[screen].navigation.goBack()),
  hardware: (h: any) => h.act(() => { if (h.ref.current.canGoBack()) h.ref.current.goBack(); }),
  gesto: (h: any, screen: string) => h.act(() => {
    const nav = store[screen].navigation;
    nav.dispatch({ ...StackActions.pop(), source: store[screen].route.key, target: nav.getState().key });
  }),
};
const MODOS = Object.keys(BACKS) as (keyof typeof BACKS)[];

const toTab = (h: any, tab: string) => h.act(() => h.ref.current.navigate(tab));

// fluxos cruzados #1 e #2 (Início -> Treinos) e #3 (Treinos -> Exercícios)
const FLUXOS_INICIO = [
  { nome: '#1 Personal Trainer', screen: 'AIPersonalTrainer', params: {} },
  { nome: '#1 Plano inteligente', screen: 'SmartPlan', params: {} },
  { nome: '#1 Criar treino', screen: 'CreateWorkout', params: {} },
  { nome: '#2 Último treino', screen: 'WorkoutDetail', params: { workout: { id: 'w1' } } },
];

describe('fluxos #1 e #2: Início -> Treinos', () => {
  for (const f of FLUXOS_INICIO) for (const modo of MODOS) {
    it(`${f.nome}, primeira vez (pilha nova), voltar por ${modo}: volta ao Início, na tela de origem, e a pilha de Treinos fica só com a lista`, async () => {
      const h = await setup();
      expect(h.stackOf('Workouts')).toBeUndefined(); // pilha de Treinos ainda não existe
      await h.act(() => openInTab(store.HomeMain.navigation, 'Workouts', f.screen, f.params, 'Home'));
      expect(h.tabName()).toBe('Workouts');
      expect(h.names('Workouts')).toEqual(['WorkoutsList', f.screen]); // initial:false: a lista fica por baixo
      expect(store[f.screen].route.params.from).toBe('Home');
      await BACKS[modo](h, f.screen);
      expect(h.tabName()).toBe('Home');
      expect(h.top()).toBe('HomeMain');
      expect(h.names('Workouts')).toEqual(['WorkoutsList']); // sem tela pendurada
      h.unmount();
    });
    it(`${f.nome}, pilha de Treinos já existente (com a tela de outra visita por baixo), voltar por ${modo}: volta ao Início e a pilha fica como estava`, async () => {
      const h = await setup();
      await toTab(h, 'Workouts');
      await h.act(() => store.WorkoutsList.navigation.navigate('ActiveWorkout')); // pilha de Treinos com mais de uma tela
      await toTab(h, 'Home');
      expect(h.names('Workouts')).toEqual(['WorkoutsList', 'ActiveWorkout']);
      store.WorkoutsList.setCount && (await h.act(() => store.WorkoutsList.setCount(5))); // estado da tela de baixo (rolagem, filtros)
      const idLista = store.WorkoutsList.id;
      await h.act(() => openInTab(store.HomeMain.navigation, 'Workouts', f.screen, f.params, 'Home'));
      expect(h.tabName()).toBe('Workouts');
      expect(h.top()).toBe(f.screen);
      await BACKS[modo](h, f.screen);
      expect(h.tabName()).toBe('Home');
      expect(h.names('Workouts')).toEqual(['WorkoutsList', 'ActiveWorkout']); // exatamente como antes da visita
      expect(store.WorkoutsList.id).toBe(idLista); // a tela de baixo não foi recriada
      expect(store.WorkoutsList.count).toBe(5); // e o estado dela foi preservado
      h.unmount();
    });
  }
});

describe('fluxo #3: Treinos -> Exercícios (detalhe do exercício)', () => {
  for (const modo of MODOS) {
    it(`primeira vez (pilha de Exercícios nova), voltar por ${modo}: volta ao detalhe do treino, na aba Treinos, com o estado preservado`, async () => {
      const h = await setup();
      await toTab(h, 'Workouts');
      await h.act(() => store.WorkoutsList.navigation.navigate('WorkoutDetail', { workout: { id: 'w1' } })); // mesma aba: sem `from`
      await h.act(() => store.WorkoutDetail.setCount(7)); // por exemplo, a rolagem do detalhe
      const idDetalhe = store.WorkoutDetail.id;
      expect(h.stackOf('Exercises')).toBeUndefined();
      await h.act(() => openInTab(store.WorkoutDetail.navigation, 'Exercises', 'ExerciseDetail', { exercise: { id: 'squat' } }, 'Workouts'));
      expect(h.tabName()).toBe('Exercises');
      expect(h.names('Exercises')).toEqual(['ExercisesList', 'ExerciseDetail']);
      await BACKS[modo](h, 'ExerciseDetail');
      expect(h.tabName()).toBe('Workouts');
      expect(h.top()).toBe('WorkoutDetail');
      expect(h.names('Workouts')).toEqual(['WorkoutsList', 'WorkoutDetail']);
      expect(h.names('Exercises')).toEqual(['ExercisesList']); // o detalhe não fica pendurado na aba Exercícios
      expect(store.WorkoutDetail.id).toBe(idDetalhe);
      expect(store.WorkoutDetail.count).toBe(7);
      h.unmount();
    });
    it(`pilha de Exercícios já existente, voltar por ${modo}: volta ao detalhe do treino e a lista de Exercícios fica como estava`, async () => {
      const h = await setup();
      await toTab(h, 'Exercises');
      await h.act(() => store.ExercisesList.setCount(3)); // filtro/rolagem da lista de exercícios
      const idLista = store.ExercisesList.id;
      await toTab(h, 'Workouts');
      await h.act(() => store.WorkoutsList.navigation.navigate('WorkoutDetail', { workout: { id: 'w1' } }));
      await h.act(() => openInTab(store.WorkoutDetail.navigation, 'Exercises', 'ExerciseDetail', { exercise: { id: 'squat' } }, 'Workouts'));
      expect(h.names('Exercises')).toEqual(['ExercisesList', 'ExerciseDetail']);
      await BACKS[modo](h, 'ExerciseDetail');
      expect(h.tabName()).toBe('Workouts');
      expect(h.top()).toBe('WorkoutDetail');
      expect(h.names('Exercises')).toEqual(['ExercisesList']);
      expect(store.ExercisesList.id).toBe(idLista);
      expect(store.ExercisesList.count).toBe(3);
      h.unmount();
    });
  }
  it('cadeia Início -> detalhe do treino -> detalhe do exercício: cada voltar desfaz um passo (exercício -> treino -> Início)', async () => {
    const h = await setup();
    await h.act(() => openInTab(store.HomeMain.navigation, 'Workouts', 'WorkoutDetail', { workout: { id: 'w1' } }, 'Home'));
    await h.act(() => openInTab(store.WorkoutDetail.navigation, 'Exercises', 'ExerciseDetail', { exercise: { id: 'squat' } }, 'Workouts'));
    expect(h.tabName()).toBe('Exercises');
    await BACKS.hardware(h);
    expect([h.tabName(), h.top()]).toEqual(['Workouts', 'WorkoutDetail']);
    await BACKS.hardware(h);
    expect([h.tabName(), h.top()]).toEqual(['Home', 'HomeMain']);
    expect(h.names('Workouts')).toEqual(['WorkoutsList']);
    expect(h.names('Exercises')).toEqual(['ExercisesList']);
    h.unmount();
  });
});

describe('sem cruzar abas, nada muda', () => {
  for (const modo of MODOS) {
    it(`detalhe do exercício aberto da própria aba Exercícios (sem "from"), voltar por ${modo}: volta à lista, na mesma aba`, async () => {
      const h = await setup();
      await toTab(h, 'Exercises');
      await h.act(() => store.ExercisesList.navigation.navigate('ExerciseDetail', { exercise: { id: 'squat' } }));
      expect(store.ExerciseDetail.route.params.from).toBeUndefined();
      await BACKS[modo](h, 'ExerciseDetail');
      expect([h.tabName(), h.top()]).toEqual(['Exercises', 'ExercisesList']);
      h.unmount();
    });
    it(`detalhe do treino aberto da própria aba Treinos, voltar por ${modo}: volta à lista de Treinos`, async () => {
      const h = await setup();
      await toTab(h, 'Workouts');
      await h.act(() => store.WorkoutsList.navigation.navigate('WorkoutDetail', { workout: { id: 'w1' } }));
      await BACKS[modo](h, 'WorkoutDetail');
      expect([h.tabName(), h.top()]).toEqual(['Workouts', 'WorkoutsList']);
      h.unmount();
    });
  }
  it('o hardware back na raiz de uma aba continua indo para a primeira aba (backBehavior padrão, não alterado)', async () => {
    const h = await setup();
    await toTab(h, 'Exercises');
    await BACKS.hardware(h);
    expect(h.tabName()).toBe('Home');
    h.unmount();
  });
  it('a tela com "from" que NÃO é removida por voltar não é interceptada: replace, reset, popToTop e navigate passam direto', async () => {
    for (const acao of ['replace', 'reset', 'popToTop', 'navigate']) {
      const h = await setup();
      await h.act(() => openInTab(store.HomeMain.navigation, 'Workouts', 'WorkoutDetail', { workout: { id: 'w1' } }, 'Home'));
      const nav = store.WorkoutDetail.navigation;
      if (acao === 'replace') await h.act(() => nav.dispatch(StackActions.replace('CreateWorkout')));
      if (acao === 'reset') await h.act(() => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'WorkoutsList' }] })));
      if (acao === 'popToTop') await h.act(() => nav.dispatch(StackActions.popToTop()));
      if (acao === 'navigate') await h.act(() => nav.navigate('WorkoutsList'));
      expect(h.tabName(), acao).toBe('Workouts'); // continua em Treinos: não foi mandado de volta para o Início
      h.unmount();
    }
  });
  it('sem navegador de abas acima (pilha sozinha), o hook deixa o voltar normal', async () => {
    const Solo = () => React.createElement(Stack.Navigator, null,
      React.createElement(Stack.Screen, { name: 'A', component: makeScreen('A', false) }),
      React.createElement(Stack.Screen, { name: 'B', component: makeScreen('B', true), initialParams: { from: 'Home' } }));
    const ref = React.createRef<any>();
    let r: any;
    await TestRenderer.act(async () => { r = TestRenderer.create(React.createElement(BaseNavigationContainer, { ref }, React.createElement(Solo))); });
    await TestRenderer.act(async () => { store.A.navigation.navigate('B', { from: 'Home' }); });
    expect(ref.current.getRootState().index).toBe(1);
    await TestRenderer.act(async () => { store.B.navigation.goBack(); });
    expect(ref.current.getRootState().index).toBe(0);
    r.unmount();
  });
});

describe('voltar interno da série guiada', () => {
  // Réplica fiel da lógica do GuidedPlanScreen: as etapas internas voltam sozinhas (estado local) e só o voltar da primeira etapa chama navigation.goBack().
  it('as etapas internas voltam sem sair da tela; só o voltar da etapa inicial volta à aba de origem', async () => {
    const h = await setup();
    let internal;
    const Guided = ({ navigation, route }: any) => {
      useReturnToOrigin(navigation, route);
      const [stage, setStage] = React.useState('review');
      const goBack = () => { if (stage === 'review') { setStage('ask'); return; } if (stage === 'ask') { setStage('intro'); return; } navigation.goBack(); };
      internal = { goBack, get stage() { return stage; } };
      return null;
    };
    h.unmount();
    const GSTACK = () => React.createElement(Stack.Navigator, null, ...STACKS.Workouts.map(([n]) => React.createElement(Stack.Screen, { key: n, name: n, component: n === 'AIPersonalTrainer' ? Guided : SCREENS[n] })));
    const comps: Record<string, any> = { ...STACK_COMPONENTS, Workouts: GSTACK };
    const Root2 = () => React.createElement(Tabs.Navigator, { initialRouteName: 'Home' }, ...['Home', 'Workouts', 'Exercises', 'Profile'].map((t) => React.createElement(Tabs.Screen, { key: t, name: t, component: comps[t] })));
    const ref = React.createRef<any>();
    let r: any;
    await TestRenderer.act(async () => { r = TestRenderer.create(React.createElement(BaseNavigationContainer, { ref }, React.createElement(Root2))); });
    const state = () => ref.current.getRootState();
    await TestRenderer.act(async () => { openInTab(store.HomeMain.navigation, 'Workouts', 'AIPersonalTrainer', {}, 'Home'); });
    expect(state().routes[state().index].name).toBe('Workouts');
    await TestRenderer.act(async () => { internal.goBack(); });
    expect(internal.stage).toBe('ask'); // voltou uma etapa, continua na tela
    expect(state().routes[state().index].name).toBe('Workouts');
    await TestRenderer.act(async () => { internal.goBack(); });
    expect(internal.stage).toBe('intro');
    expect(state().routes[state().index].name).toBe('Workouts');
    await TestRenderer.act(async () => { internal.goBack(); }); // etapa inicial: sai da tela
    expect(state().routes[state().index].name).toBe('Home');
    r.unmount();
  });
});

describe('trava e filtro de ações (unidade)', () => {
  it('shouldIntercept: só com "from", fora da trava e para GO_BACK ou POP', () => {
    expect(shouldIntercept({ from: 'Home', leaving: false, actionType: 'GO_BACK' })).toBe(true);
    expect(shouldIntercept({ from: 'Home', leaving: false, actionType: 'POP' })).toBe(true);
    for (const t of ['REPLACE', 'RESET', 'POP_TO_TOP', 'NAVIGATE', 'PUSH', undefined]) expect(shouldIntercept({ from: 'Home', leaving: false, actionType: t }), String(t)).toBe(false);
    expect(shouldIntercept({ from: 'Home', leaving: true, actionType: 'GO_BACK' })).toBe(false); // trava: nada de laço
    expect(shouldIntercept({ from: undefined, leaving: false, actionType: 'GO_BACK' })).toBe(false);
    expect(shouldIntercept({ from: '', leaving: false, actionType: 'GO_BACK' })).toBe(false);
  });
});

describe('ligação no app (o que os testes acima exercitam é o que o app usa)', () => {
  it('as pilhas do teste existem no MainNavigator, e as abas, a ordem e a aba inicial não mudaram (sem backBehavior)', () => {
    const nav = read('src/navigation/MainNavigator.js');
    for (const [, screens] of Object.entries(STACKS)) for (const [n] of screens) expect(nav, n).toContain(`name="${n}"`);
    const order = [...nav.matchAll(/<Tab\.Screen name="(\w+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['Home', 'Workouts', 'Exercises', 'Profile']);
    expect(nav).not.toMatch(/backBehavior|initialRouteName/);
  });
  it('os pontos que cruzam abas usam openInTab com a origem certa; as telas de destino chamam o hook', () => {
    const home = read('src/screens/HomeScreen.js');
    for (const s of ['AIPersonalTrainer', 'SmartPlan', 'CreateWorkout', 'WorkoutDetail']) expect(home).toContain(`openInTab(navigation, 'Workouts', '${s}'`);
    expect(home).not.toMatch(/navigation\.navigate\('Workouts'/);
    expect(read('src/screens/WorkoutDetailScreen.js')).toContain("openInTab(navigation, 'Exercises', 'ExerciseDetail', { exercise: ex }, 'Workouts')");
    for (const f of ['WorkoutDetail', 'ExerciseDetail', 'SmartPlan', 'CreateWorkout', 'GuidedPlan']) expect(read(`src/screens/${f}Screen.js`), f).toContain('useReturnToOrigin(navigation, route)');
    expect(read('src/navigation/crossTab.js')).toContain('initial: false');
  });
  it('o voltar interno da série guiada (etapas) segue no próprio componente e a troca de aba do "Ir para o início" não mudou', () => {
    const g = read('src/screens/GuidedPlanScreen.js');
    expect(g).toContain('setQIndex(qIndex - 1)');
    expect(g).toContain("navigation.getParent()?.navigate('Home')");
    expect(g).toContain("BackHandler.addEventListener('hardwareBackPress', goBack)");
  });
});
