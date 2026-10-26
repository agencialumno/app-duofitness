// Textos da tela "Conectar dispositivos" (Apple Saúde no iOS, Health Connect no Android). Tudo DESLIGADO enquanto
// EXPO_PUBLIC_HEALTH_INTEGRATION não for "true": a tela só explica, mostra "Em breve" e não pede nenhuma permissão.
// Todo o texto fica aqui para revisão (jurídica e de saúde). Sem promessas, sem diagnóstico, sem dieta.
import { HEALTH_PRIVACY_LINES } from './healthInfoContent';

export const CONNECT_COPY = {
  title: 'Conectar dispositivos',
  soonTitle: 'Em breve',
  soonText: 'A conexão com o Apple Saúde e com o Health Connect ainda não está disponível. Quando estiver, você poderá escolher o que o app lê, categoria por categoria.',
  webText: 'A conexão com o Apple Saúde (iPhone) e com o Health Connect (Android) existe só no app do celular.',
  minorText: 'Este recurso não está disponível para menores de 18 anos.',
  providers: {
    ios: { id: 'apple_saude', name: 'Apple Saúde' },
    android: { id: 'health_connect', name: 'Health Connect' },
  },
  readsTitle: 'O que o app vai ler, e para quê',
  reads: [
    { category: 'activity', label: 'Atividade', items: ['Passos', 'Distância', 'Minutos de exercício'], why: 'Para mostrar a sua atividade do dia e a tendência dos últimos 7 e 30 dias.' },
    { category: 'sleep', label: 'Sono', items: ['Duração do sono', 'Hora de dormir e de acordar'], why: 'Para mostrar quanto e quando você dorme, e a regularidade dos horários.' },
    { category: 'heart', label: 'Coração e recuperação', items: ['Frequência cardíaca em repouso', 'Variabilidade da frequência cardíaca'], why: 'Para mostrar o valor e a tendência, comparando você com você mesmo.' },
    { category: 'body', label: 'Composição corporal', items: ['Peso', '% de gordura', 'Massa magra'], why: 'Para acompanhar as suas medidas ao longo do tempo. Não disponível para menores de 18 anos.' },
  ],
  permissionsTitle: 'Permissões',
  permissions: [
    'Só leitura: o app lê as categorias que você marcar e não grava nada no Apple Saúde nem no Health Connect.',
    'Nada é lido antes do seu consentimento, e o sistema ainda vai pedir a sua permissão.',
    'Você pode mudar ou retirar a permissão quando quiser, nos Ajustes do aparelho.',
  ],
  privacyTitle: 'Seus dados',
  privacy: HEALTH_PRIVACY_LINES,
  consentTitle: 'Seu consentimento',
  consentIntro: 'Marque o que o app pode ler. Nada vem marcado.',
  consentText: 'Autorizo o app a ler, neste aparelho, os dados das categorias marcadas, só para mostrá-los aqui.',
  connectButton: 'Conectar',
  needCategory: 'Marque pelo menos uma categoria para conectar.',
  disconnectTitle: 'Desconectar',
  disconnectText: 'Desconectar para de ler e apaga deste aparelho tudo o que foi importado do aparelho de saúde. O que você registrou à mão fica.',
  disconnectButton: 'Desconectar e apagar o que foi importado',
  disconnectConfirm: 'Apagar o que foi importado',
};

export function allConnectStrings() {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(CONNECT_COPY);
  return out;
}
