// Ferramenta "criar_plano" (tool use) e validação do plano devolvido pela IA.
import { z } from 'zod';
import { allowedExercises, imcCategoryOf, type FilterContext } from './filters.js';

export const TOOL_NAME = 'criar_plano';
export const MIN_EXERCISES_PER_SERIES = 5;
export const MAX_EXERCISES_PER_SERIES = 12;

export const GOALS = ['lose_weight', 'gain_muscle', 'maintain', 'health'] as const;

// Schema enviado à Anthropic. Sem restrições numéricas aqui: quem garante os
// limites é o Zod abaixo.
export const PLAN_TOOL = {
  name: TOOL_NAME,
  description:
    'Entrega o plano de treino final (séries A, B e C) depois de coletar todos os dados do aluno. ' +
    'Chame esta ferramenta UMA vez, só quando já souber peso, altura, objetivos, dias por semana e minutos por sessão. ' +
    'Use apenas ids da lista de exercícios permitidos.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['perfil', 'series'],
    properties: {
      perfil: {
        type: 'object',
        additionalProperties: false,
        required: ['weight', 'height', 'goals', 'days', 'time'],
        properties: {
          weight: { type: 'number', description: 'Peso em kg (20 a 400)' },
          height: { type: 'number', description: 'Altura em cm (50 a 260)' },
          goals: { type: 'array', items: { type: 'string', enum: [...GOALS] }, description: 'Objetivos do aluno' },
          days: { type: 'integer', description: 'Dias de treino por semana (1 a 7)' },
          time: { type: 'integer', description: 'Minutos por sessão (10 a 180)' },
        },
      },
      series: {
        type: 'array',
        description: 'Uma entrada por série: A, B e C (somente as que o aluno vai usar, no máximo 3)',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['serie', 'name', 'focus', 'exercises'],
          properties: {
            serie: { type: 'string', enum: ['A', 'B', 'C'] },
            name: { type: 'string', description: 'Ex: "Série A — Peito, Ombros e Tríceps"' },
            focus: { type: 'string', description: 'Ex: "Peito e Ombros"' },
            exercises: {
              type: 'array',
              description: 'Exercícios na ordem de execução',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'sets', 'reps', 'rest'],
                properties: {
                  id: { type: 'string', description: 'id exato da lista de exercícios permitidos' },
                  sets: { type: 'integer', description: 'Séries (1 a 6)' },
                  reps: { type: 'string', description: 'Repetições ou tempo. Ex: "10–12", "15", "30–45s"' },
                  rest: { type: 'integer', description: 'Descanso em segundos (0 a 180)' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const exerciseItemSchema = z.object({
  id: z.string().min(1).max(40),
  sets: z.number().int().min(1).max(6),
  reps: z.string().trim().min(1).max(14),
  rest: z.number().int().min(0).max(180),
});

const profileSchema = z.object({
  weight: z.number().min(20).max(400),
  height: z.number().min(50).max(260),
  goals: z.array(z.enum(GOALS)).max(4),
  days: z.number().int().min(1).max(7),
  time: z.number().int().min(10).max(180),
});

const toolInputSchema = z.object({
  perfil: profileSchema.partial().optional(),
  series: z
    .array(
      z.object({
        serie: z.enum(['A', 'B', 'C']),
        name: z.string().trim().min(1).max(80),
        focus: z.string().trim().min(1).max(80),
        exercises: z.array(z.unknown()).max(30),
      }),
    )
    .min(1)
    .max(3),
});

export interface PlanExercise {
  id: string;
  sets: number;
  reps: string;
  rest: number;
}
export interface PlanSeries {
  serie: 'A' | 'B' | 'C';
  name: string;
  focus: string;
  exercises: PlanExercise[];
}
export interface Collected {
  weight?: number | undefined;
  height?: number | undefined;
  goals?: string[] | undefined;
  days?: number | undefined;
  time?: number | undefined;
}

export type PlanResult =
  | { ok: true; plan: { series: PlanSeries[] }; collected: Collected; discarded: number }
  | { ok: false; code: 'plan_invalid'; reason: string; collected: Collected };

/**
 * Valida o input da ferramenta. Cada exercício passa por um Zod próprio: id fora
 * do subconjunto permitido (combo, nível, limitação, faixa etária, IMC), número
 * fora dos limites ou id repetido na série é descartado. Série com menos de
 * MIN_EXERCISES_PER_SERIES exercícios depois disso invalida o plano inteiro.
 */
export function validatePlan(input: unknown, ctx: FilterContext): PlanResult {
  const parsed = toolInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'plan_invalid', reason: 'estrutura inválida', collected: {} };
  }

  const collected: Collected = parsed.data.perfil ?? {};

  // O que a IA coletou na conversa pode deixar o filtro mais restrito (IMC).
  const strictCtx: FilterContext = {
    ...ctx,
    imcCategory: ctx.imcCategory ?? imcCategoryOf(collected.weight, collected.height),
  };
  const allowed = new Set(allowedExercises(strictCtx).map((e) => e.id));
  const itemSchema = exerciseItemSchema.refine((e) => allowed.has(e.id), { message: 'id não permitido' });

  const seenSeries = new Set<string>();
  const series: PlanSeries[] = [];
  let discarded = 0;

  for (const s of parsed.data.series) {
    if (seenSeries.has(s.serie)) {
      return { ok: false, code: 'plan_invalid', reason: `série ${s.serie} repetida`, collected };
    }
    seenSeries.add(s.serie);

    const seenIds = new Set<string>();
    const exercises: PlanExercise[] = [];
    for (const raw of s.exercises) {
      const item = itemSchema.safeParse(raw);
      if (!item.success || seenIds.has(item.data.id)) {
        discarded++;
        continue;
      }
      seenIds.add(item.data.id);
      exercises.push(item.data);
    }

    if (exercises.length < MIN_EXERCISES_PER_SERIES) {
      return {
        ok: false,
        code: 'plan_invalid',
        reason: `série ${s.serie} ficou com ${exercises.length} exercícios (mínimo ${MIN_EXERCISES_PER_SERIES})`,
        collected,
      };
    }
    series.push({ serie: s.serie, name: s.name, focus: s.focus, exercises: exercises.slice(0, MAX_EXERCISES_PER_SERIES) });
  }

  return { ok: true, plan: { series }, collected, discarded };
}
