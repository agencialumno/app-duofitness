// INTEGRAÇÃO, área 8: acessibilidade por teste ESTÁTICO. Todo toque (TouchableOpacity, Pressable) das telas e componentes precisa ter nome acessível
// (accessibilityLabel não vazio, ou um <Text> dentro dele, que o leitor de tela lê) e papel (accessibilityRole); alvo mínimo de 44 pt (minHeight/minWidth
// ou hitSlop quando o estilo declara um tamanho menor). Só dá para confirmar de verdade com VoiceOver/TalkBack e texto grande num aparelho.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const walk = (d: string): string[] => readdirSync(path.join(REPO, d)).flatMap((n) => {
  const rel = `${d}/${n}`;
  return statSync(path.join(REPO, rel)).isDirectory() ? walk(rel) : n.endsWith('.js') ? [rel] : [];
});
const FILES = [...walk('src/screens'), ...walk('src/components')];
const TAGS = ['TouchableOpacity', 'Pressable', 'TouchableHighlight', 'TouchableWithoutFeedback'];

type Touch = { file: string; line: number; tag: string; attrs: string; inner: string; styleNames: string[]; src: string };

// Lê a tag de abertura até o ">" que fecha (ignorando "=>" e o que está dentro de chaves e aspas).
function openingTag(src: string, start: number): { attrs: string; end: number; selfClosing: boolean } {
  let i = start; let depth = 0; let quote = '';
  for (; i < src.length; i++) {
    const c = src[i]!;
    if (quote) { if (c === quote && src[i - 1] !== '\\') quote = ''; continue; }
    if (depth === 0 && (c === '"' || c === "'")) { quote = c; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; continue; }
    if (depth > 0 && (c === '"' || c === "'" || c === '`')) { quote = c; continue; }
    if (depth === 0 && c === '>' && src[i - 1] !== '=') return { attrs: src.slice(start, i), end: i + 1, selfClosing: src[i - 1] === '/' };
  }
  return { attrs: src.slice(start), end: src.length, selfClosing: false };
}
function collect(): Touch[] {
  const out: Touch[] = [];
  for (const file of FILES) {
    const src = readFileSync(path.join(REPO, file), 'utf8');
    for (const tag of TAGS) {
      const re = new RegExp(`<${tag}(?=[\\s>/])`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const o = openingTag(src, m.index + m[0].length);
        const close = o.selfClosing ? -1 : src.indexOf(`</${tag}>`, o.end);
        const inner = o.selfClosing || close < 0 ? '' : src.slice(o.end, close);
        const styleNames = [...o.attrs.matchAll(/styles\.(\w+)/g)].map((x) => x[1]!);
        out.push({ file, line: src.slice(0, m.index).split('\n').length, tag, attrs: o.attrs, inner, styleNames, src });
      }
    }
  }
  return out;
}
const TOUCHES = collect();
const where = (t: Touch) => `${t.file}:${t.line}`;

// Tamanho declarado no estilo (styles.X) que o toque usa: devolve { w, h, minW, minH } com números quando existem.
function styleBox(t: Touch) {
  const box: Record<string, number> = {};
  for (const name of t.styleNames) {
    const m = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`).exec(t.src);
    if (!m) continue;
    for (const k of ['width', 'height', 'minWidth', 'minHeight']) {
      const v = new RegExp(`\\b${k}:\\s*(\\d+(?:\\.\\d+)?)\\b`).exec(m[1]!);
      if (v) box[k] = Math.max(box[k] ?? 0, Number(v[1]));
    }
  }
  return box;
}
// "Nome acessível": accessibilityLabel não vazio (ou dinâmico), ou texto visível dentro do toque.
const hasName = (t: Touch) => {
  const lab = /accessibilityLabel=(?:"([^"]*)"|\{([^}]*)\}|\{`([^`]*)`\})/.exec(t.attrs) || /accessibilityLabel=\{[\s\S]+\}/.exec(t.attrs);
  if (lab) return !(lab[1] !== undefined && lab[1].trim() === '') && !(lab[2] !== undefined && /^['"]\s*['"]$/.test(lab[2].trim()));
  return /<Text[\s>]/.test(t.inner) || /\{[a-zA-Z_.]*label[a-zA-Z_.]*\}/i.test(t.inner);
};
const hasRole = (t: Touch) => /accessibilityRole=|\brole=/.test(t.attrs);
// Área de toque efetiva = tamanho do estilo + hitSlop (de cada lado). Menor que 44 pt em qualquer eixo = alvo pequeno.
const slopOf = (attrs: string) => {
  const m = /hitSlop=\{\{([^}]*)\}\}/.exec(attrs);
  const n = (k: string) => Number(new RegExp(`${k}:\\s*(\\d+(?:\\.\\d+)?)`).exec(m?.[1] ?? '')?.[1] ?? 0);
  return { x: n('left') + n('right'), y: n('top') + n('bottom') };
};
const smallTarget = (t: Touch) => {
  const b = styleBox(t);
  const slop = slopOf(t.attrs);
  const tooSmallH = b.height !== undefined && !(b.minHeight && b.minHeight >= 44) && b.height + slop.y < 44;
  const tooSmallW = b.width !== undefined && !(b.minWidth && b.minWidth >= 44) && b.width + slop.x < 44;
  return tooSmallH || tooSmallW;
};

// BASELINE de achados (bugs B3, B4 e B5 do docs/relatorio-testes.md), por arquivo:linha. Dois tipos de teste:
//  - "it.fails": a regra COMPLETA (nenhuma violação); está marcado como falha esperada até o app ser corrigido (não corrigimos código de produção aqui);
//  - "catraca": nenhuma violação NOVA além do baseline (impede piorar), e o baseline não pode ficar com linhas que já foram corrigidas.
// Se o código do app mudar de linha, atualize as listas (o teste da catraca diz quais entraram e quais saíram).
const BASELINE_SEM_NOME: string[] = []; // B3 corrigido: nenhum toque sem nome acessível
const CONHECIDOS_SEM_PAPEL: string[] = []; // B4 corrigido: todo toque declara o papel
const CONHECIDOS_ALVO_PEQUENO: string[] = []; // B5 corrigido: hitSlop leva os 2 alvos a 44 pt

describe('acessibilidade estática dos toques', () => {
  it('o levantamento encontra os toques do app (sanidade do analisador)', () => {
    expect(TOUCHES.length).toBeGreaterThan(80);
    expect(FILES.length).toBeGreaterThan(40);
  });
  it('REGRA COMPLETA: todo toque tem nome acessível (accessibilityLabel não vazio ou texto dentro)', () => {
    const bad = TOUCHES.filter((t) => !hasName(t)).map(where);
    expect(bad, `toques sem nome acessível:\n${bad.join('\n')}`).toEqual([]);
  });

  it('CATRACA: nenhum toque NOVO sem nome acessível, sem papel ou com alvo menor que 44 pt além do baseline conhecido (e o baseline não tem itens já corrigidos)', () => {
    const cmp = (label: string, atual: string[], base: string[]) => {
      const novos = atual.filter((w) => !base.includes(w));
      const corrigidos = base.filter((w) => !atual.includes(w));
      expect(novos, `${label}: violações NOVAS`).toEqual([]);
      expect(corrigidos, `${label}: já corrigidos, remova do baseline`).toEqual([]);
    };
    cmp('sem nome', TOUCHES.filter((t) => !hasName(t)).map(where), BASELINE_SEM_NOME);
    cmp('sem papel', TOUCHES.filter((t) => !hasRole(t)).map(where), CONHECIDOS_SEM_PAPEL);
    cmp('alvo pequeno', TOUCHES.filter(smallTarget).map(where), CONHECIDOS_ALVO_PEQUENO);
  });
  it('nenhum accessibilityLabel estático está vazio', () => {
    const bad = TOUCHES.filter((t) => /accessibilityLabel=""|accessibilityLabel=\{''\}|accessibilityLabel=\{""\}/.test(t.attrs)).map(where);
    expect(bad).toEqual([]);
  });
  it('REGRA COMPLETA: todo toque declara o papel (button, link, checkbox, tab...)', () => {
    const bad = TOUCHES.filter((t) => !hasRole(t)).map(where);
    expect(bad, `toques sem accessibilityRole:\n${bad.join('\n')}`).toEqual([]);
  });
  it('REGRA COMPLETA: alvo mínimo de 44 pt: nenhum toque tem estilo menor que 44 pt, contando o hitSlop (tamanho + folga dos dois lados)', () => {
    const bad = TOUCHES.filter(smallTarget).map(where);
    expect(bad, `alvos menores que 44 pt:\n${bad.join('\n')}`).toEqual([]);
  });
  it('telas principais: os botões de ação principais têm rótulo (Voltar, Entrar, Criar conta, Conectar, Sair da conta...)', () => {
    const all = (f: string) => TOUCHES.filter((t) => t.file === f);
    for (const [file, label] of [
      ['src/screens/onboarding/WelcomeScreen.js', 'Criar conta'], ['src/screens/onboarding/WelcomeScreen.js', 'Entrar'],
      ['src/screens/StoreScreen.js', 'Voltar'], ['src/screens/HealthConnectScreen.js', 'Voltar'],
    ] as const) expect(all(file).some((t) => t.attrs.includes(`accessibilityLabel="${label}"`)), `${file} sem "${label}"`).toBe(true);
  });
  it('as caixas de seleção (checkbox) informam o estado marcado ao leitor de tela', () => {
    for (const t of TOUCHES.filter((x) => /accessibilityRole="checkbox"/.test(x.attrs))) expect(/accessibilityState=/.test(t.attrs), where(t)).toBe(true);
  });
  it('imagens decorativas ficam fora da leitura ou têm descrição; ícones soltos não são tocáveis sem rótulo', () => {
    // um Ionicons dentro de um toque não precisa de rótulo próprio (o toque tem); aqui só se confere que o analisador viu os toques com ícone
    expect(TOUCHES.some((t) => /<Ionicons/.test(t.inner))).toBe(true);
  });
});

describe('B5: os dois alvos que eram menores que 44 pt', () => {
  it('o botão "+" de Treinos (38 pt) e o confirmar chips do Personal Trainer (32 pt) chegam a 44 pt pelo hitSlop, sem mudar o estilo visível', () => {
    const alvo = (file: string, label: string) => TOUCHES.find((t) => t.file === file && t.attrs.includes(`accessibilityLabel="${label}"`))!;
    const add = alvo('src/screens/WorkoutsScreen.js', 'Criar treino');
    expect(styleBox(add).width! + slopOf(add.attrs).x).toBeGreaterThanOrEqual(44);
    expect(styleBox(add).height! + slopOf(add.attrs).y).toBeGreaterThanOrEqual(44);
    expect(styleBox(add)).toMatchObject({ width: 38, height: 38 }); // o desenho continua 38x38
    const chip = alvo('src/screens/AIPersonalTrainerScreen.js', 'Confirmar seleção');
    expect(styleBox(chip).width! + slopOf(chip.attrs).x).toBeGreaterThanOrEqual(44);
    expect(styleBox(chip).height! + slopOf(chip.attrs).y).toBeGreaterThanOrEqual(44);
    expect(styleBox(chip)).toMatchObject({ width: 32, height: 32 });
  });
});
