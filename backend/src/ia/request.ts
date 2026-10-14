import { z } from 'zod';
import { COMBOS, LEVELS, LIMITATIONS } from './filters.js';
import { GOALS } from './plan.js';

export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 1000;

const profileSchema = z.object({
  combo: z.enum(COMBOS),
  limitation: z.enum(LIMITATIONS).optional(),
  level: z.enum(LEVELS).optional(),
  weight: z.number().min(20).max(400).optional(),
  height: z.number().min(50).max(260).optional(),
  goals: z.array(z.enum(GOALS)).max(4).optional(),
  gender: z.string().trim().max(20).optional(),
  ageGroup: z.string().trim().max(10).optional(),
});

export const chatRequestSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
        }),
      )
      .min(1)
      .max(MAX_MESSAGES),
    profile: profileSchema,
  })
  .refine((v) => v.messages[0]?.role === 'user', { message: 'a primeira mensagem deve ser do usuário' })
  .refine((v) => v.messages[v.messages.length - 1]?.role === 'user', { message: 'a última mensagem deve ser do usuário' });

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatProfile = z.infer<typeof profileSchema>;
