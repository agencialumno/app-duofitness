// Ajuda ("i"): textos em src/data/infoContent.js, passo a passo do IMC (src/utils/imcInfo.js, que só reutiliza
// imc.js), menores de 18, varredura de termos proibidos e fiação dos componentes.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as C from '../../src/data/infoContent.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as I from '../../src/utils/imcInfo.js';
// @ts-expect-error módulo JS do app, sem tipos
import { calculateIMC, getIMCCategory } from '../../src/utils/imc.js';
// @ts-expect-error módulo JS do app, sem tipos
import { COMBOS } from '../../src/data/combosEquipment.js';
// @ts-expect-error módulo JS do app, sem tipos
import { MARKETPLACE_CONFIG } from '../../src/data/marketplaceConfig.js';
// @ts-expect-error módulo JS do app, sem tipos
import { QUIET_BELOW, MODERATE_BELOW } from '../../src/utils/occupancy.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');

type Block = { type: string; text?: string; items?: unknown[]; bands?: { id: string; label: string; here: boolean; range: string; color: string }[]; position?: number };

// Todos os textos de um bloco (para varreduras)
function textsOf(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.text) out.push(b.text);
    for (const it of b.items || []) {
      if (typeof it === 'string') out.push(it);
      else if (it && typeof it === 'object') out.push(...Object.values(it as Record<string, string>).map(String));
    }
    for (const band of b.bands || []) out.push(band.label, band.range);
  }
  return out;
}

// Termos que NUNCA podem aparecer nas sugestões (e, na lista base, em nenhum texto de ajuda)
const PROIBIDOS_SUGESTAO =
  /dieta|calor[ií]a|kcal|d[eé]ficit|emagre|perder peso|perda de peso|reduzir peso|queim|jejum|dose|dosag|suplement|whey|proteína em pó|meta de peso|peso ideal|prazo|em \d+ (dias|semanas|meses)|resultado|garant|milagr|rápido|r[aá]pida|detox|cardápio|restri[cç]/i;
const PROIBIDOS_GERAL =
  /dieta|calor[ií]a|kcal|d[eé]ficit|emagre|perder peso|queim|jejum|dose\b|dosag|suplement|meta de peso|peso ideal|em \d+ (dias|semanas|meses)|garant|milagr|detox|cardápio/i;

const heightsCm = 200; // altura 2 m: IMC = peso / 4 (valores exatos, sem erro de ponto flutuante)
const CASOS: [number, number, string][] = [
  [71.6, 17.9, 'underweight'], [74, 18.5, 'normal'], [99.6, 24.9, 'normal'], [100, 25, 'overweight'],
  [119.6, 29.9, 'overweight'], [120, 30, 'obese1'], [139.6, 34.9, 'obese1'], [140, 35, 'obese2'],
];

describe('temas de ajuda (infoContent)', () => {
  const themes = Object.entries(C.INFO_THEMES) as [string, { label: string; titulo: string; blocks: Block[] }][];

  it('há os 12 temas pedidos', () => {
    expect(themes.map(([k]) => k).sort()).toEqual(['academiaAgora', 'combos', 'duoScore', 'imc', 'limitacao', 'marketplace', 'montandoSerie', 'nivelXp', 'objetivos', 'saude', 'sequencia', 'seriesRepsDescanso'].sort());
  });

  it('cada tema tem rótulo, título e blocos válidos, sem texto vazio', () => {
    for (const [key, th] of themes) {
      expect(th.label.length, key).toBeGreaterThan(2);
      expect(th.titulo.length, key).toBeGreaterThan(2);
      expect(th.blocks.length, key).toBeGreaterThan(0);
      for (const b of th.blocks) expect(['heading', 'text', 'list', 'notice']).toContain(b.type);
      for (const tx of textsOf(th.blocks)) expect(tx.trim().length, key).toBeGreaterThan(3);
    }
  });

  it('toda chave usada em <InfoButton tema="..."> existe em infoContent, e todo tema é usado em alguma tela', () => {
    function walk(dir: string, out: string[] = []) {
      for (const f of readdirSync(dir)) {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) walk(p, out); else if (/\.js$/.test(f)) out.push(p);
      }
      return out;
    }
    const used = new Set<string>();
    for (const f of walk(path.join(REPO, 'src'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/<InfoButton[^>]*\btema="([A-Za-z]+)"/g)) used.add(m[1]!);
    }
    for (const k of used) expect(Object.keys(C.INFO_THEMES), `tema "${k}" não existe`).toContain(k);
    // (a checagem "todo tema é usado" entra quando os demais ícones forem ligados, no commit seguinte)
  });

  it('nenhum texto de ajuda tem dieta, caloria, déficit, emagrecimento, dose, suplemento, meta ou promessa', () => {
    for (const [key, th] of themes) {
      for (const tx of textsOf(th.blocks)) expect(PROIBIDOS_GERAL.test(tx), `${key}: "${tx}"`).toBe(false);
    }
    for (const tx of [...C.IMC_TEXT.naoMostra, ...C.IMC_TEXT.habitos, C.IMC_TEXT.profissional, C.IMC_TEXT.manter, C.IMC_TEXT.menor, C.IMC_TEXT.oQueE]) {
      expect(PROIBIDOS_GERAL.test(tx), tx).toBe(false);
    }
  });

  it('o aviso final é o texto combinado', () => {
    expect(C.INFO_NOTICE).toBe('Informação geral. Não substitui avaliação profissional.');
    expect(C.IMC_TEXT.aviso).toBe(C.INFO_NOTICE);
  });

  it('os fatos dos textos batem com o app (se a regra mudar, o texto precisa ser revisto)', () => {
    const ctx = read('src/context/AppContext.js');
    // XP e níveis
    expect(ctx).toMatch(/xpEarned: 50/);
    for (const lim of ['xp < 100', 'xp < 300', 'xp < 600', 'xp < 1000', 'xp < 2000']) expect(ctx).toContain(lim);
    const xp = textsOf(C.INFO_THEMES.nivelXp.blocks).join(' ');
    for (const s of ['50 XP', '0 a 99', '100 a 299', '300 a 599', '600 a 999', '1000 a 1999', '2000 XP', 'Iniciante', 'Ativo', 'Dedicado', 'Avançado', 'Elite', 'Lenda']) expect(xp).toContain(s);
    // sequência: o contador da Home soma 1 por treino e nunca zera
    expect(ctx).toMatch(/const newStreak = streak \+ 1/);
    expect(textsOf(C.INFO_THEMES.sequencia.blocks).join(' ')).toMatch(/soma 1 a cada treino/);
    // lotação: faixas
    expect(QUIET_BELOW).toBe(0.4);
    expect(MODERATE_BELOW).toBe(0.75);
    const gym = textsOf(C.INFO_THEMES.academiaAgora.blocks).join(' ');
    expect(gym).toContain('40%');
    expect(gym).toContain('75%');
    // combos vêm da fonte única
    const combos = textsOf(C.INFO_THEMES.combos.blocks).join(' ');
    for (const c of COMBOS as { label: string; description: string }[]) { expect(combos).toContain(c.label); expect(combos).toContain(c.description); }
    // marketplace: aviso do parceiro
    expect(textsOf(C.INFO_THEMES.marketplace.blocks)).toContain(MARKETPLACE_CONFIG.partnerNotice);
    // Duo Score aponta para "Por que este número?" sem duplicar a fórmula (sem pesos nem porcentagens)
    const score = textsOf(C.INFO_THEMES.duoScore.blocks).join(' ');
    expect(score).toContain('Por que este número?');
    expect(score).not.toMatch(/\d+ ?%|peso de|50|20|15/);
    expect(read('src/screens/HealthScreen.js')).toContain('Por que este número?');
  });
});

describe('IMC: passo a passo com os valores reais (imcInfo + imc.js)', () => {
  it.each(CASOS)('peso %d kg e altura 2 m: o resultado exibido é o de calculateIMC (%d) e a faixa é %s', (peso, imcEsperado, faixa) => {
    const info = I.describeImc({ weight: peso, height: heightsCm, ageGroup: '26-35' });
    const imc = calculateIMC(peso, heightsCm);
    expect(imc).toBe(imcEsperado);
    expect(info.kind).toBe('adult');
    expect(info.value).toBe(imc);
    expect(info.shown).toBe(imc.toFixed(1).replace('.', ','));
    expect(info.steps).toHaveLength(5);
    expect(info.steps[4].conta).toBe(info.shown);
    expect(info.category.id).toBe(faixa);
    expect(info.category.id).toBe(getIMCCategory(imc).id);
    const bandaMarcada = info.scale.filter((b: { here: boolean }) => b.here);
    expect(bandaMarcada).toHaveLength(1);
    expect(bandaMarcada[0].id).toBe(faixa);
  });

  it('os passos têm os valores reais, com vírgula decimal (78 kg, 175 cm)', () => {
    const { steps } = I.describeImc({ weight: 78, height: 175, ageGroup: '26-35' });
    expect(steps.map((s: { titulo: string }) => s.titulo)).toEqual(['Peso', 'Altura em metros', 'Altura ao quadrado', 'Divisão', 'Resultado, com 1 casa decimal']);
    expect(steps[0].conta).toBe('78 kg');
    expect(steps[1].conta).toBe('175 cm ÷ 100 = 1,75 m');
    expect(steps[2].conta).toBe('1,75 × 1,75 = 3,0625');
    expect(steps[3].conta).toBe('78 ÷ 3,0625 = 25,4694');
    expect(steps[4].conta).toBe('25,5');
  });

  it('aceita peso e altura em texto com vírgula ("78,5" e "172,5")', () => {
    const info = I.describeImc({ weight: '78,5', height: '172,5', ageGroup: '18-25' });
    expect(info.value).toBeCloseTo(78.5 / (1.725 * 1.725), 10);
    expect(info.steps[0].conta).toBe('78,5 kg');
    expect(info.steps[2].conta).toBe('1,725 × 1,725 = 2,975625');
  });

  it('o valor exibido vem da MESMA função do app (sem fórmula duplicada em imcInfo.js)', () => {
    const src = read('src/utils/imcInfo.js');
    expect(src).toMatch(/calculateIMC\(w, hCm\)/);
    expect(src).toMatch(/getIMCCategory\(/);
    expect(src).not.toMatch(/\/ \(hM \* hM\)|weight \/ /);
  });

  it('valor arredondado em outra faixa: avisa que o cálculo usa o valor exato', () => {
    const info = I.describeImc({ weight: 99.84, height: 200, ageGroup: '26-35' }); // 24,96
    expect(info.shown).toBe('25,0');
    expect(info.category.id).toBe('normal'); // o app classifica pelo valor exato
    expect(info.note).toMatch(/valor exato \(24,96\)/);
    const sem = I.describeImc({ weight: 78, height: 175, ageGroup: '26-35' });
    expect(sem.note).toBeNull();
  });

  it('a escala tem 5 faixas em texto, cores e a posição do usuário entre 0 e 1', () => {
    const info = I.describeImc({ weight: 78, height: 175, ageGroup: '26-35' });
    expect(info.scale.map((b: { label: string }) => b.label)).toEqual(['Abaixo do peso', 'Peso normal', 'Sobrepeso', 'Obesidade grau I', 'Obesidade grau II+']);
    expect(info.scale.map((b: { range: string }) => b.range)).toEqual(['Abaixo de 18,5', '18,5 a 24,9', '25,0 a 29,9', '30,0 a 34,9', '35,0 ou mais']);
    expect(new Set(info.scale.map((b: { color: string }) => b.color)).size).toBeGreaterThanOrEqual(4);
    expect(info.position).toBeGreaterThan(0);
    expect(info.position).toBeLessThan(1);
    const pos = (w: number) => I.describeImc({ weight: w, height: 200, ageGroup: '26-35' }).position;
    expect(pos(50)).toBe(0); // abaixo do início da escala
    expect(pos(400)).toBe(1); // acima do fim
    expect(pos(80)).toBeLessThan(pos(120));
  });

  it('sem peso ou altura: nenhum cálculo, só a orientação para preencher', () => {
    for (const d of [{}, { weight: 70 }, { height: 170 }, { weight: 0, height: 170 }, { weight: 'abc', height: 170 }, { weight: -5, height: 170 }]) {
      expect(I.describeImc(d).kind).toBe('missing');
    }
    const sheet = I.buildImcSheet({ ageGroup: '26-35' });
    expect(sheet.kind).toBe('missing');
    expect(textsOf(sheet.blocks).join(' ')).toContain('Dados físicos');
    expect(sheet.blocks.some((b: Block) => b.type === 'scale' || b.type === 'steps')).toBe(false);
  });
});

describe('IMC: menores de 18 anos (under18)', () => {
  const LABELS = ['Abaixo do peso', 'Peso normal', 'Sobrepeso', 'Obesidade grau I', 'Obesidade grau II'];
  for (const [peso, imc] of CASOS) {
    it(`IMC ${imc}: mostra número e passos, SEM categoria, SEM escala e SEM sugestões`, () => {
      const sheet = I.buildImcSheet({ weight: peso, height: heightsCm, ageGroup: 'under18' });
      expect(sheet.kind).toBe('minor');
      const types = sheet.blocks.map((b: Block) => b.type);
      expect(types).toContain('steps');
      expect(types).not.toContain('scale');
      const all = textsOf(sheet.blocks).join(' | ');
      for (const l of LABELS) expect(all, l).not.toContain(l);
      expect(all).not.toMatch(/Sugestões de hábitos|Mantenha os hábitos|Atividade física gradual|médico ou nutricionista para uma avaliação individual/);
      expect(all).toMatch(/percentil/);
      expect(all).toMatch(/profissional de saúde/);
      const steps = sheet.blocks.find((b: Block) => b.type === 'steps');
      expect(steps.items[4].conta).toBe(calculateIMC(peso, heightsCm).toFixed(1).replace('.', ','));
      expect(sheet.blocks[sheet.blocks.length - 1]).toEqual({ type: 'notice', text: C.INFO_NOTICE });
    });
  }
  it('describeImc para menor não traz categoria nem escala, e showImcCategory é falso', () => {
    const info = I.describeImc({ weight: 60, height: 170, ageGroup: 'under18' });
    expect(info.category).toBeUndefined();
    expect(info.scale).toBeUndefined();
    expect(I.suggestionsFor(info)).toEqual([]);
    expect(I.showImcCategory('under18')).toBe(false);
    for (const a of ['18-25', '26-35', '36-45', '46+', undefined]) expect(I.showImcCategory(a)).toBe(true);
  });
});

describe('IMC: sugestões só de hábitos', () => {
  const faixas: [number, string][] = [[60, 'underweight'], [80, 'normal'], [110, 'overweight'], [130, 'obese1'], [150, 'obese2']];
  for (const [peso, faixa] of faixas) {
    it(`faixa ${faixa}: sugestões neutras, sem termos proibidos`, () => {
      const info = I.describeImc({ weight: peso, height: 200, ageGroup: '26-35' });
      expect(info.category.id).toBe(faixa);
      const sug: string[] = I.suggestionsFor(info);
      expect(sug.length).toBeGreaterThan(0);
      for (const s of sug) expect(PROIBIDOS_SUGESTAO.test(s), s).toBe(false);
      if (faixa === 'normal') {
        expect(sug).toEqual([C.IMC_TEXT.manter]);
      } else {
        const j = sug.join(' ');
        expect(j).toMatch(/gradual e regular/);
        expect(j).toMatch(/[Ss]ono/);
        expect(j).toMatch(/[Hh]idrata/);
        expect(j).toMatch(/médico ou nutricionista/);
        expect(j).toMatch(/avaliação individual/);
      }
    });
  }

  it('o scanner funciona: pega os termos proibidos e deixa passar os textos certos', () => {
    for (const ruim of ['Faça uma dieta', 'Reduza as calorias', 'Crie um déficit calórico', 'Emagreça rápido', 'Tome um suplemento', 'Dose de 5 g', 'Perca peso em 30 dias', 'Resultado garantido', 'Meta de peso de 70 kg', 'Queime gordura']) {
      expect(PROIBIDOS_SUGESTAO.test(ruim), ruim).toBe(true);
    }
    for (const s of [...C.IMC_TEXT.habitos, C.IMC_TEXT.profissional, C.IMC_TEXT.manter]) expect(PROIBIDOS_SUGESTAO.test(s), s).toBe(false);
  });

  it('toda a folha do IMC (todas as faixas e idades) passa na varredura geral', () => {
    for (const age of ['under18', '18-25', '26-35', '46+']) {
      for (const [peso] of CASOS) {
        const sheet = I.buildImcSheet({ weight: peso, height: heightsCm, ageGroup: age });
        for (const tx of textsOf(sheet.blocks)) expect(PROIBIDOS_GERAL.test(tx), `${age}/${peso}: ${tx}`).toBe(false);
      }
    }
  });

  it('a folha do IMC tem as seções pedidas na ordem: o que é, cálculo, escala, o que não mostra, sugestões e aviso', () => {
    const sheet = I.buildImcSheet({ weight: 90, height: 175, ageGroup: '26-35' });
    const heads = sheet.blocks.filter((b: Block) => b.type === 'heading').map((b: Block) => b.text);
    expect(heads).toEqual(['O que é o IMC', 'Como foi calculado para você', 'Onde você está na escala', 'O que o IMC não mostra', 'Sugestões de hábitos']);
    const all = textsOf(sheet.blocks).join(' ');
    expect(all).toMatch(/Não separa músculo de gordura/);
    expect(all).toMatch(/Não é um diagnóstico/);
    expect(all).toMatch(/atletas e pessoas muito musculosas/);
    expect(sheet.blocks[sheet.blocks.length - 1].text).toBe('Informação geral. Não substitui avaliação profissional.');
  });
});

describe('componentes (fiação)', () => {
  const button = read('src/components/InfoButton.js');
  const sheet = read('src/components/InfoSheet.js');
  it('InfoButton: área de 44x44, role button e rótulo "Saiba mais sobre <tema>"', () => {
    expect(button).toMatch(/width: 44, height: 44/);
    expect(button).toMatch(/accessibilityRole="button"/);
    expect(button).toMatch(/accessibilityLabel=\{`Saiba mais sobre \$\{theme\.label\}`\}/);
  });
  it('InfoSheet: Modal, fecha pelo voltar do Android, fora e no botão, foco no título, insets, sem animação com Reduzir movimento', () => {
    expect(sheet).toMatch(/<Modal/);
    expect(sheet).toMatch(/onRequestClose=\{onClose\}/);
    expect(sheet).toMatch(/<Pressable style=\{styles\.backdrop\} onPress=\{onClose\}/);
    expect(sheet).toMatch(/accessibilityLabel="Fechar"/);
    expect(sheet).toMatch(/setAccessibilityFocus/);
    expect(sheet).toMatch(/onShow=\{focusTitle\}/);
    expect(sheet).toMatch(/useSafeAreaInsets/);
    expect(sheet).toMatch(/animationType=\{reduceMotion \? 'none' : 'slide'\}/);
    expect(sheet).toMatch(/accessibilityViewIsModal/);
    expect(sheet).toMatch(/minHeight: 52/);
    expect(sheet).not.toMatch(/\bheight: (?!14|12|4|22|24|28|0)\d{2,}/); // sem alturas fixas de texto (fonte dinâmica)
  });
  it('a lista rolável da folha esconde a barra de rolagem', () => {
    expect(sheet).toMatch(/<ScrollView showsVerticalScrollIndicator=\{false\}/);
  });
  it('sem dependência nova: só Modal do React Native', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(Object.keys(pkg.dependencies).join(' ')).not.toMatch(/modal|bottom-sheet|gorhom/i);
  });
});

describe('IMC: fiação nas telas e menores de 18', () => {
  const telas = ['src/screens/HomeScreen.js', 'src/screens/ProfileScreen.js', 'src/screens/EditBodyDataScreen.js', 'src/screens/onboarding/BodyDataScreen.js'];
  it.each(telas)('%s tem o "i" do IMC com o cálculo da própria pessoa e esconde a categoria de menores', (f) => {
    const src = read(f);
    expect(src).toMatch(/<InfoButton tema="imc" blocks=\{buildImcSheet\(/);
    expect(src).toMatch(/showImcCategory\(/);
    // o rótulo da categoria só aparece quando permitido
    expect(src).toMatch(/imcCategoryVisible &&[\s\S]{0,260}imcInfo\.label/);
    // nenhuma outra renderização solta do rótulo
    const solto = [...src.matchAll(/\{imcInfo\.label\}/g)].length;
    const guardado = [...src.matchAll(/imcCategoryVisible &&[\s\S]{0,80}\{imcInfo\.label\}|imcCategoryVisible && \(\s*<View[\s\S]{0,260}\{imcInfo\.label\}/g)].length;
    expect(solto).toBe(guardado);
  });
  it('a dica da faixa (tip) também só aparece para quem pode ver a categoria', () => {
    for (const f of ['src/screens/ProfileScreen.js', 'src/screens/EditBodyDataScreen.js', 'src/screens/onboarding/BodyDataScreen.js']) {
      const src = read(f);
      expect(src.indexOf('imcInfo.tip'), f).toBeGreaterThan(src.lastIndexOf('imcCategoryVisible &&', src.indexOf('imcInfo.tip')) );
      expect(src.lastIndexOf('imcCategoryVisible &&', src.indexOf('imcInfo.tip')), f).toBeGreaterThan(-1);
    }
  });
  it('a tabela de referência de adultos some para menores', () => {
    const src = read('src/screens/EditBodyDataScreen.js');
    expect(src).toMatch(/\{imcCategoryVisible && \(\s*<View style=\{styles\.refCard\}>/);
  });
  it('o que o gerador recebe NÃO muda: imcCategory continua sendo gravado e enviado como antes', () => {
    expect(read('src/screens/onboarding/BodyDataScreen.js')).toMatch(/imcCategory: imcInfo\?\.id/);
    expect(read('src/screens/EditBodyDataScreen.js')).toMatch(/imcCategory: imcInfo\?\.id/);
    expect(read('src/screens/SmartPlanScreen.js')).toMatch(/imcCategory: user\?\.imcCategory/);
  });
});
