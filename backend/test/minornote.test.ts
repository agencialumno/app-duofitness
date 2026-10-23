// Frase para menores de 18 anos nos objetivos: só para under18, sem tocar no gerador.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as C from '../../src/data/infoContent.js';
import { PROIBIDOS_NUCLEO } from './textrules';

const REPO = path.resolve(__dirname, '../..');
const FRASE = 'Para menores de 18 anos, a série foca em hábitos e técnica.';

describe('frase para menores de 18 nos objetivos', () => {
  it('o texto é exatamente o pedido e passa no scanner de textos', () => {
    expect(C.MINOR_FOCUS_NOTE).toBe(FRASE);
    expect(PROIBIDOS_NUCLEO.test(FRASE)).toBe(false);
  });
  it('a ajuda de objetivos recebe a frase só para under18; os demais veem o tema padrão', () => {
    const texts = (b: { text?: string }[]) => b.map((x) => x.text);
    expect(texts(C.getObjetivosBlocks('under18'))).toContain(FRASE);
    for (const a of [undefined, '18-25', '26-35', '36-45', '46+']) {
      expect(C.getObjetivosBlocks(a)).toBe(C.INFO_THEMES.objetivos.blocks);
      expect(texts(C.getObjetivosBlocks(a))).not.toContain(FRASE);
    }
  });
  it('a tela dos objetivos (série guiada) mostra a frase só quando user.ageGroup é under18', () => {
    const src = readFileSync(path.join(REPO, 'src/screens/GuidedPlanScreen.js'), 'utf8');
    expect(src).toMatch(/user\?\.ageGroup === 'under18' && <Text style=\{styles\.minorNote\}>\{MINOR_FOCUS_NOTE\}/);
    expect(src).toMatch(/getObjetivosBlocks\(user\?\.ageGroup\)/);
  });
  it('o gerador não foi tocado', () => {
    for (const f of ['src/utils/workoutGenerator.js', 'src/utils/imc.js', 'src/utils/planForAge.js']) {
      expect(readFileSync(path.join(REPO, f), 'utf8')).not.toMatch(/MINOR_FOCUS_NOTE|getObjetivosBlocks/);
    }
  });
});
