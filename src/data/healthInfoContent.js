// Textos de ajuda ("i") e de significado das categorias da Saúde. TODO o texto fica aqui, para revisão por um profissional de saúde.
// Regras: informação geral e neutra, só hábitos; nada de dieta, calorias, déficit, meta de peso ou de gordura, prazo, suplemento, dose,
// diagnóstico nem alerta clínico. Não há "gordura visceral", "idade metabólica" nem "idade biológica" no app.
// Mesmo formato de infoContent.js: { label, titulo, blocks }, lido por <InfoButton label titulo blocks>.
import { SCORE_DISCLAIMER } from '../utils/health';

const h = (text) => ({ type: 'heading', text });
const t = (text) => ({ type: 'text', text });
const l = (...items) => ({ type: 'list', items });
const n = (text) => ({ type: 'notice', text });

export const HEALTH_NOTICE = 'Informação geral. Não substitui avaliação profissional.';

// Privacidade (aviso fixo na tela e na conexão).
export const HEALTH_PRIVACY_LINES = [
  'Seus dados de saúde ficam só neste aparelho.',
  'Eles nunca são usados no marketplace, nunca são enviados ao servidor nem à sua conta, e nunca são gravados em registros (logs) do app.',
];

export const HEALTH_INFO = {
  body: {
    label: 'composição corporal',
    titulo: 'Composição corporal',
    blocks: [
      h('O que é'),
      t('Aqui você acompanha o seu peso e, se quiser, o % de gordura e a massa magra que aparecem em balanças ou aparelhos de bioimpedância.'),
      h('Como a nota é calculada'),
      t('A nota mede o hábito de acompanhar (quantos dias com registro nos últimos 30) e a estabilidade das medidas. Ela não usa metas e é igual para quem sobe ou desce.'),
      h('O que isso não mostra'),
      l(
        'Não diz qual deveria ser o seu peso nem a sua composição.',
        'Medidas de balança variam com a hora do dia e com a hidratação: compare sempre no mesmo horário.',
        'Os números de % de gordura e massa magra são estimativas do aparelho e podem ser diferentes de um aparelho para outro.',
      ),
      n(HEALTH_NOTICE),
    ],
  },
  activity: {
    label: 'atividade',
    titulo: 'Atividade',
    blocks: [
      h('O que é'),
      t('Passos, distância e minutos de exercício do dia. Você pode registrar à mão; no futuro, o app poderá ler do Apple Saúde ou do Health Connect, se você permitir.'),
      h('Como a nota é calculada'),
      l(
        'Passos: a média dos dias com registro nos últimos 7, comparada com 7.000 passos por dia.',
        'Exercício: o ritmo semanal estimado, comparado com 150 minutos por semana.',
        'Dia sem registro não entra na conta e não conta como zero. São precisos pelo menos 3 dias com registro.',
      ),
      n(HEALTH_NOTICE),
    ],
  },
  sleep: {
    label: 'sono',
    titulo: 'Sono',
    blocks: [
      h('O que é'),
      t('A duração das suas noites e, se você registrar, a hora de dormir e de acordar.'),
      h('Como a nota é calculada'),
      l(
        'Duração: de 7 a 9 horas por noite dão a nota máxima (para menores de 18 anos, de 8 a 10 horas).',
        'Regularidade: horário de dormir parecido de uma noite para outra.',
        'São precisas pelo menos 3 noites com registro nos últimos 7 dias.',
      ),
      t('Cada pessoa tem uma necessidade de sono diferente. A nota é uma referência de hábito, não uma avaliação do seu sono.'),
      n(HEALTH_NOTICE),
    ],
  },
  heart: {
    label: 'coração e recuperação',
    titulo: 'Coração e recuperação',
    blocks: [
      h('O que é'),
      t('A frequência cardíaca em repouso (batimentos por minuto em descanso) e a variabilidade da frequência cardíaca (VFC, em milissegundos), que costumam aparecer em relógios e pulseiras.'),
      h('Como ler'),
      l(
        'Esses números variam de pessoa para pessoa e de um dia para o outro (sono, estresse, treino, temperatura).',
        'O app mostra o valor e a tendência dos últimos 7 e 30 dias. Não há nota nem meta para esta categoria.',
        'Compare você com você mesmo, sempre do mesmo aparelho e no mesmo horário.',
      ),
      n('Estes números são só uma referência pessoal. Se você tiver dúvidas sobre o seu coração, converse com um profissional de saúde.'),
    ],
  },
  hydration: {
    label: 'hidratação',
    titulo: 'Hidratação',
    blocks: [
      h('O que é'),
      t('Os copos de água que você registra por dia, comparados com a sua meta diária de copos (você pode mudar a meta).'),
      h('Como a nota é calculada'),
      t('A média dos dias com registro nos últimos 7: cada dia vale quanto você chegou da meta de copos, no máximo 100%. Dia sem registro não conta.'),
      n(HEALTH_NOTICE),
    ],
  },
};

// O que cada categoria "significa" no detalhe (uma frase curta, sem julgamento).
export const HEALTH_MEANING = {
  body: 'Acompanhar as medidas ao longo do tempo ajuda a ver a tendência, mais do que o número de um dia.',
  activity: 'Movimentar-se com regularidade importa mais do que um dia isolado.',
  sleep: 'Dormir em horários parecidos e por tempo suficiente faz parte da recuperação entre os treinos.',
  heart: 'Estes números mostram como o seu corpo está respondendo, comparado com você mesmo.',
  hydration: 'Beber água ao longo do dia faz parte dos bons hábitos.',
};

export const HEALTH_SCORE_DISCLAIMER = SCORE_DISCLAIMER;

// Frases soltas, para o scanner.
export function allHealthInfoStrings() {
  const out = [...HEALTH_PRIVACY_LINES, HEALTH_NOTICE, ...Object.values(HEALTH_MEANING)];
  for (const th of Object.values(HEALTH_INFO)) {
    out.push(th.label, th.titulo);
    for (const b of th.blocks) {
      if (b.text) out.push(b.text);
      if (b.items) out.push(...b.items);
    }
  }
  return out;
}
