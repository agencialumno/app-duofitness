// Textos de ajuda ("i") do app. TODO o texto fica aqui, um objeto por tema, para revisão por um profissional de saúde.
// Regras: informação geral e neutra; só hábitos; nada de dieta, calorias, déficit, meta de peso, prazo, dose,
// suplemento nem promessa de resultado (um teste varre estes textos). Cada tema é lido por <InfoButton tema="...">.
//
// Formato: { label, titulo, blocks }. `label` completa "Saiba mais sobre <label>" (leitor de tela).
// Blocos: { type: 'heading'|'text'|'list'|'notice', ... } (o tema "imc" também recebe blocos calculados, ver imcInfo.js).
import { COMBOS } from './combosEquipment';
import { MARKETPLACE_CONFIG } from './marketplaceConfig';

export const INFO_NOTICE = 'Informação geral. Não substitui avaliação profissional.';

const h = (text) => ({ type: 'heading', text });
const t = (text) => ({ type: 'text', text });
const l = (...items) => ({ type: 'list', items });
const n = (text) => ({ type: 'notice', text });

// ---------- IMC (partes fixas; os passos do cálculo e a escala vêm de imcInfo.js) ----------

export const IMC_TEXT = {
  oQueE:
    'O IMC (Índice de Massa Corporal) é um número que relaciona o seu peso com a sua altura. É uma referência geral e rápida, usada por profissionais de saúde junto com outras avaliações.',
  naoMostra: [
    'Não separa músculo de gordura: duas pessoas com o mesmo IMC podem ter composições corporais bem diferentes.',
    'Não é um diagnóstico e não diz, sozinho, como está a sua saúde.',
    'Pode enganar atletas e pessoas muito musculosas, que podem ter IMC alto sem que isso seja um problema.',
    'Não leva em conta onde o corpo acumula gordura, exames de saúde, histórico familiar nem a sua rotina.',
  ],
  // Sugestões SÓ de hábitos, em tom neutro. Um teste confere que não há dieta, caloria, déficit, meta, prazo etc.
  habitos: [
    'Atividade física gradual e regular: comece no seu ritmo e aumente aos poucos.',
    'Sono: procure manter horários regulares de descanso.',
    'Hidratação: beba água ao longo do dia.',
  ],
  profissional:
    'Antes de iniciar um programa de treino intenso, converse com um médico ou nutricionista para uma avaliação individual.',
  manter:
    'Mantenha os hábitos que já funcionam: atividade física regular, bom sono e hidratação ao longo do dia.',
  menor:
    'Para menores de 18 anos, as faixas de IMC de adultos não se aplicam. Nessa idade, o IMC é avaliado por curvas de percentil de idade e sexo, que um profissional de saúde sabe interpretar. Converse com um profissional de saúde para entender o seu resultado.',
  semDados: 'Informe seu peso e altura em Perfil, em "Dados físicos", para ver o cálculo do seu IMC.',
  aviso: INFO_NOTICE,
};

// Quais faixas pedem a conversa com um profissional (todas, menos a normal).
export const IMC_BAND_ADVICE = {
  underweight: 'profissional',
  normal: 'manter',
  overweight: 'profissional',
  obese1: 'profissional',
  obese2: 'profissional',
};

// ---------- Demais temas ----------

export const INFO_THEMES = {
  imc: {
    label: 'IMC',
    titulo: 'Sobre o IMC',
    // os blocos reais são montados por buildImcSheet() com os dados da pessoa; este é o conteúdo padrão (sem dados)
    blocks: [h('O que é'), t(IMC_TEXT.oQueE), h('O que o IMC não mostra'), l(...IMC_TEXT.naoMostra), n(IMC_TEXT.aviso)],
  },

  nivelXp: {
    label: 'nível e XP',
    titulo: 'Nível e XP',
    blocks: [
      h('Como ganhar XP'),
      t('Você ganha 50 XP cada vez que conclui um treino. Alguns marcos de XP (500 e 1000) desbloqueiam conquistas.'),
      h('Como funcionam os níveis'),
      t('O nível sobe conforme o XP total acumulado:'),
      l(
        'Nível 1, Iniciante: de 0 a 99 XP',
        'Nível 2, Ativo: de 100 a 299 XP',
        'Nível 3, Dedicado: de 300 a 599 XP',
        'Nível 4, Avançado: de 600 a 999 XP',
        'Nível 5, Elite: de 1000 a 1999 XP',
        'Nível 6, Lenda: a partir de 2000 XP',
      ),
      t('XP e nível mostram a sua constância no app. Não medem condicionamento físico nem saúde.'),
    ],
  },

  sequencia: {
    label: 'sequência',
    titulo: 'Sequência',
    blocks: [
      h('Como é contada'),
      t('A Sequência é o número de dias seguidos em que você concluiu pelo menos um treino. A conta começa em hoje ou, se você ainda não treinou hoje, em ontem.'),
      h('O que quebra a sequência'),
      t('Ela volta a zero quando passa um dia inteiro sem nenhum treino concluído. Dois treinos no mesmo dia contam como um dia.'),
      h('Onde aparece'),
      t('É o mesmo número na Home e na Saúde. Ele entra no Duo Score: 7 dias seguidos valem a nota máxima desse item.'),
      t('Descanso entre treinos faz parte da rotina: não se cobre por isso.'),
    ],
  },

  duoScore: {
    label: 'Duo Score',
    titulo: 'Duo Score',
    blocks: [
      t('O Duo Score vai de 0 a 100 e resume os seus hábitos: treinos da semana, sequência, hidratação e, quando você registra o peso, a tendência dele. Itens sem registro não entram na conta e não derrubam o número.'),
      t('Para ver como o seu número foi calculado, toque em "Por que este número?" logo abaixo do score.'),
      n('O Duo Score mede hábitos. Não é uma avaliação médica.'),
    ],
  },

  academiaAgora: {
    label: 'a lotação da academia',
    titulo: 'Academia agora',
    blocks: [
      h('Tranquila, Moderada e Cheia'),
      t('O estado compara quantas pessoas estão na academia com a capacidade dela:'),
      l(
        'Tranquila: menos de 40% da capacidade',
        'Moderada: de 40% até menos de 75%',
        'Cheia: 75% da capacidade ou mais',
      ),
      h('Dados de exemplo'),
      t('Enquanto a academia não estiver ligada ao sistema de acesso, os números são de demonstração e não representam a sua academia. O selo "Dados de exemplo" avisa isso.'),
      t('O app mostra só a contagem de pessoas, sem identificar ninguém. "Atualizado há X min" diz há quanto tempo a contagem foi feita.'),
    ],
  },

  combos: {
    label: 'o combo da academia',
    titulo: 'Combos Duo Fitness',
    blocks: [
      t('O combo é o conjunto de equipamentos da academia do seu condomínio. Perguntamos para montar a sua série só com exercícios que você consegue fazer lá. Quanto maior o combo, mais máquinas e mais variedade.'),
      l(...COMBOS.map((c) => `${c.label}: ${c.description}`)),
      t('Não sabe qual é o seu? Pergunte à administração do condomínio.'),
    ],
  },

  objetivos: {
    label: 'objetivos',
    titulo: 'Objetivos',
    blocks: [
      t('Você pode escolher mais de um objetivo porque as metas costumam se combinar. A série considera todos os que você marcar.'),
      t('Cada objetivo ajusta a série de um jeito, por exemplo: mais séries nos exercícios principais, descansos mais curtos ou cardio no início do treino.'),
      t('Você pode mudar os objetivos quando quiser.'),
    ],
  },

  limitacao: {
    label: 'limitação física',
    titulo: 'Limitação física',
    blocks: [
      t('Se você tem desconforto no joelho, no ombro ou na lombar, a série deixa de fora exercícios que costumam sobrecarregar essa região.'),
      t('É uma regra geral e simples, que não considera o seu caso em particular.'),
      n('Se você tem dor ou lesão, converse com um médico ou fisioterapeuta antes de treinar. Informação geral, não substitui avaliação profissional.'),
    ],
  },

  montandoSerie: {
    label: 'como a série é montada',
    titulo: 'Como a série é montada',
    blocks: [
      t('O Personal Trainer Duo monta a série por regras, no seu aparelho. Não usa inteligência artificial nem internet. Os passos são:'),
      l(
        'Ler o seu perfil: peso, altura, nível e objetivos.',
        'Conferir os equipamentos do combo da sua academia.',
        'Equilibrar os grupos musculares entre as séries A, B e C.',
        'Ajustar a série ao seu objetivo e às suas limitações.',
      ),
      t('Depois você pode trocar exercícios, pedir ajustes e só então salvar.'),
    ],
  },

  seriesRepsDescanso: {
    label: 'séries, repetições e descanso',
    titulo: 'Séries, repetições e descanso',
    blocks: [
      l(
        'Repetições: quantas vezes você faz o movimento seguido.',
        'Séries: quantas vezes você repete esse bloco de repetições.',
        'Descanso: o tempo de pausa entre uma série e a próxima.',
      ),
      t('Os números são uma referência. Escolha uma carga que permita fazer o movimento com boa técnica, do começo ao fim da série.'),
      t('Cansaço do treino é esperado. Se sentir dor, pare e, se ela continuar, procure um profissional de saúde.'),
    ],
  },

  marketplace: {
    label: 'o marketplace',
    titulo: 'Marketplace',
    blocks: [
      t(MARKETPLACE_CONFIG.partnerNotice),
      t('O marketplace é uma vitrine: o contato é feito direto com o parceiro, por WhatsApp ou pelo site dele. Nada é comprado, pago nem entregue pelo app.'),
      t('Itens marcados como "exemplo" são demonstração. Os anúncios passam por análise da equipe Duo Fitness.'),
    ],
  },

  saude: {
    label: 'a área de saúde',
    titulo: 'Água e peso',
    blocks: [
      t('Esta área acompanha hábitos. Registre os copos de água do dia (a meta é editável) e, se quiser, o seu peso de tempos em tempos para ver a tendência.'),
      t('O peso registrado serve só para você acompanhar a evolução. Não é meta nem avaliação, e o app não indica quanto você deve pesar.'),
      t('Seus dados de saúde ficam só neste aparelho.'),
      n('Informação geral. Não substitui avaliação profissional.'),
    ],
  },
};

export function getInfoTheme(key) {
  return INFO_THEMES[key] || null;
}

// Frase só para menores de 18 anos (ageGroup 'under18'), na ajuda e na tela dos objetivos.
export const MINOR_FOCUS_NOTE = 'Para menores de 18 anos, a série foca em hábitos e técnica.';

// Blocos do "i" de objetivos: para under18 acrescenta a frase acima; para os demais, exatamente o tema padrão.
export function getObjetivosBlocks(ageGroup) {
  const base = INFO_THEMES.objetivos.blocks;
  return ageGroup === 'under18' ? [...base, t(MINOR_FOCUS_NOTE)] : base;
}
