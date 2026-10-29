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
    { category: 'activity', label: 'Atividade', items: ['Passos', 'Energia ativa', 'Treinos (duração)'], why: 'Para mostrar a sua atividade do dia e a tendência dos últimos 7 e 30 dias, inclusive o que vem do Apple Watch.' },
    { category: 'sleep', label: 'Sono', items: ['Duração do sono por noite', 'Hora de dormir e de acordar'], why: 'Para mostrar quanto e quando você dorme, e a regularidade dos horários.' },
    { category: 'heart', label: 'Coração e recuperação', items: ['Frequência cardíaca', 'Frequência cardíaca em repouso', 'Variabilidade da frequência cardíaca', 'VO₂ máx.'], why: 'Para mostrar o valor e a tendência, comparando você com você mesmo.' },
    { category: 'body', label: 'Composição corporal', items: ['Peso', '% de gordura'], why: 'Para acompanhar as suas medidas ao longo do tempo. Não disponível para menores de 18 anos.' },
    { category: 'hydration', label: 'Hidratação', items: ['Água'], why: 'Para mostrar quantos copos de água você registrou no dia.' },
  ],
  permissionsTitle: 'Permissões',
  permissions: [
    'Só leitura: o app lê as categorias que você marcar e não grava nada no Apple Saúde nem no Health Connect.',
    'Nada é lido antes do seu consentimento, e o sistema ainda vai pedir a sua permissão.',
    'Você pode mudar ou retirar a permissão quando quiser, nos Ajustes do aparelho.',
    'O iPhone não informa ao app se você negou algum tipo de dado: nesse caso o app só vê "Sem dados ainda".',
  ],
  privacyTitle: 'Seus dados',
  privacy: HEALTH_PRIVACY_LINES,
  consentTitle: 'Seu consentimento',
  consentIntro: 'Marque o que o app pode ler. Nada vem marcado.',
  consentText: 'Autorizo o app a ler, neste aparelho, os dados das categorias marcadas, só para mostrá-los aqui.',
  connectButton: 'Conectar',
  connectButtonApple: 'Conectar ao Apple Saúde',
  connectedTitle: 'Conectado ao Apple Saúde',
  noDataHelp: 'Se nada aparecer, confira em Ajustes › Saúde › Acesso a dados e dispositivos › Duo Fitness.',
  connectedOk: 'Conectado. Os dados lidos ficam só neste aparelho.',
  connectedEmpty: 'Conectado, mas ainda não há dados para mostrar.',
  connectedFailed: 'Algumas categorias não puderam ser lidas agora. Puxe a tela Saúde para atualizar.',
  connectedNoRead: 'Conectado, mas não foi possível ler agora. Puxe a tela Saúde para atualizar.',
  connectError: 'Não foi possível conectar agora. Nada foi lido.',
  watchText: 'Os dados do Apple Watch pareado aparecem aqui quando o relógio os envia ao app Saúde do iPhone.',
  needCategory: 'Marque pelo menos uma categoria para conectar.',
  disconnectTitle: 'Desconectar',
  disconnectText: 'Desconectar para de ler e apaga deste aparelho tudo o que foi importado do aparelho de saúde. O que você registrou à mão fica. Para retirar a permissão em si, use Ajustes › Saúde › Acesso a dados e dispositivos › Duo Fitness.',
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
