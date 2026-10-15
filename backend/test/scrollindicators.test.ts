// Barras de rolagem escondidas: todo ScrollView, FlatList e SectionList do app precisa de
// showsVerticalScrollIndicator={false} (ou showsHorizontalScrollIndicator={false} nas listas horizontais).
// Varre src/ e App.js: uma lista nova sem a propriedade faz este teste falhar.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const COMPONENTS = ['ScrollView', 'FlatList', 'SectionList', 'VirtualizedList'];

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

type Tag = { name: string; text: string; line: number };

// Lê a tag de abertura inteira (respeitando {} e aspas, onde pode haver ">" de arrow functions).
export function findScrollTags(src: string): Tag[] {
  const tags: Tag[] = [];
  const re = new RegExp(`<(?:Animated\\.)?(${COMPONENTS.join('|')})\\b`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let q: string | null = null;
    for (; i < src.length; i++) {
      const c = src[i]!;
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    tags.push({ name: m[1]!, text: src.slice(m.index, i + 1), line: src.slice(0, m.index).split('\n').length });
  }
  return tags;
}

export function missingIndicator(tag: Tag): string | null {
  const horizontal = /\bhorizontal\b(?!\s*=\s*\{\s*false)/.test(tag.text);
  const prop = horizontal ? 'showsHorizontalScrollIndicator' : 'showsVerticalScrollIndicator';
  return new RegExp(`${prop}\\s*=\\s*\\{\\s*false\\s*\\}`).test(tag.text) ? null : prop;
}

const files = [...walk(path.join(REPO, 'src')), path.join(REPO, 'App.js')];

describe('barras de rolagem escondidas', () => {
  it('a varredura encontra as listas do app (não passa por falta de leitura)', () => {
    const total = files.reduce((n, f) => n + findScrollTags(readFileSync(f, 'utf8')).length, 0);
    expect(total).toBeGreaterThanOrEqual(25);
  });

  it('todo ScrollView, FlatList e SectionList tem a propriedade certa em false', () => {
    const problems: string[] = [];
    for (const f of files) {
      for (const t of findScrollTags(readFileSync(f, 'utf8'))) {
        const miss = missingIndicator(t);
        if (miss) problems.push(`${path.relative(REPO, f)}:${t.line} <${t.name}> sem ${miss}={false}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('o detector funciona: pega lista sem a propriedade e aceita as certas', () => {
    const bad = findScrollTags('<ScrollView style={s} contentContainerStyle={c}>x</ScrollView>')[0]!;
    expect(missingIndicator(bad)).toBe('showsVerticalScrollIndicator');
    const badH = findScrollTags('<FlatList horizontal data={d} renderItem={({ item }) => <A />} />')[0]!;
    expect(missingIndicator(badH)).toBe('showsHorizontalScrollIndicator');
    const okH = findScrollTags('<ScrollView horizontal showsHorizontalScrollIndicator={false}>')[0]!;
    expect(missingIndicator(okH)).toBeNull();
    const okV = findScrollTags('<FlatList data={d} keyExtractor={(i) => i.id} showsVerticalScrollIndicator={false} renderItem={() => <B />} />')[0]!;
    expect(missingIndicator(okV)).toBeNull();
    // horizontal só com o indicador vertical desligado não basta
    const wrong = findScrollTags('<ScrollView horizontal showsVerticalScrollIndicator={false}>')[0]!;
    expect(missingIndicator(wrong)).toBe('showsHorizontalScrollIndicator');
  });

  it('TextInput multiline: o React Native não expõe a propriedade; só o chat antigo e o formulário de anúncio usam um (lista de exceções)', () => {
    const multiline: string[] = [];
    for (const f of files) if (/\bmultiline\b/.test(readFileSync(f, 'utf8'))) multiline.push(path.relative(REPO, f).replace(/\\/g, '/'));
    // Se aparecer outro campo multiline, revise: a barra de rolagem dele não pode ser escondida por prop.
    expect(multiline.sort()).toEqual(['src/screens/AIPersonalTrainerScreen.js', 'src/screens/AdvertiseScreen.js']);
  });
});
