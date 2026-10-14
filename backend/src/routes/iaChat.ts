import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Config } from '../config.js';
import type { Store } from '../lib/store.js';
import { allowedExercises, imcCategoryOf, type FilterContext } from '../ia/filters.js';
import { PLAN_TOOL, TOOL_NAME, validatePlan } from '../ia/plan.js';
import { buildSystemPrompt, FORCE_PLAN_NOTE } from '../ia/prompt.js';
import { chatRequestSchema } from '../ia/request.js';
import { costUsd, isDailyCapReached, recordSpend } from '../middleware/security.js';

// Fronteira com o SDK da Anthropic: só o que usamos, para os testes injetarem um falso.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ChatClient {
  messages: {
    stream(params: any, options?: any): any;
  };
}

export interface ChatDeps {
  config: Config;
  store: Store;
  getClient: () => ChatClient;
  now?: () => number;
}

function userMessage(content: string, forcePlan: boolean): any {
  if (!forcePlan) return { role: 'user', content };
  return { role: 'user', content: [{ type: 'text', text: content }, { type: 'text', text: FORCE_PLAN_NOTE }] };
}

export function iaChatHandler(deps: ChatDeps) {
  const { config, store } = deps;
  const now = deps.now ?? Date.now;

  return async (c: Context) => {
    if (config.problems.length > 0) {
      console.error('[ia/chat] configuração incompleta:', config.problems.join('; '));
      return c.json({ error: 'server_misconfigured' }, 500);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: 'invalid_request', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
        400,
      );
    }
    const { messages, profile } = parsed.data;

    try {
      if (await isDailyCapReached(config, store, now)) return c.json({ error: 'daily_cap_reached' }, 429);
    } catch (e) {
      // Sem como medir o gasto, melhor recusar do que arriscar estourar o teto.
      console.error('[ia/chat] store error', e instanceof Error ? e.message : e);
      return c.json({ error: 'store_unavailable' }, 503);
    }

    const ctx: FilterContext = {
      combo: profile.combo,
      level: profile.level,
      limitation: profile.limitation ?? 'none',
      ageGroup: profile.ageGroup,
      imcCategory: imcCategoryOf(profile.weight, profile.height),
    };
    const system = buildSystemPrompt(profile, allowedExercises(ctx));

    const userTurns = messages.filter((m) => m.role === 'user').length;
    const forcePlan = userTurns >= config.maxUserTurns;
    const apiMessages = messages.map((m, i) =>
      m.role === 'user' ? userMessage(m.content, forcePlan && i === messages.length - 1) : { role: 'assistant', content: m.content },
    );

    c.header('X-Accel-Buffering', 'no');
    const res = streamSSE(c, async (stream) => {
      const ac = new AbortController();
      stream.onAbort(() => ac.abort());
      const send = (event: string, data: unknown) => stream.writeSSE({ event, data: JSON.stringify(data) });

      // Flush imediato: o app só começa a contar o tempo até o primeiro token depois disso.
      await stream.write(': connected\n\n');

      try {
        const ms = deps.getClient().messages.stream(
          {
            model: config.model,
            max_tokens: config.maxOutputTokens,
            system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
            tools: [PLAN_TOOL],
            messages: apiMessages,
          },
          { signal: ac.signal },
        );

        for await (const ev of ms) {
          if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
            await send('delta', { text: ev.delta.text });
          }
        }
        const final = await ms.finalMessage();

        try {
          await recordSpend(store, costUsd(final.usage ?? {}, config), now);
        } catch (e) {
          console.error('[ia/chat] não consegui registrar o gasto', e instanceof Error ? e.message : e);
        }

        if (final.stop_reason === 'tool_use') {
          const block = (final.content ?? []).find((b: any) => b.type === 'tool_use' && b.name === TOOL_NAME);
          if (!block) {
            await send('error', { code: 'no_plan', message: 'A IA não entregou o plano.' });
            return;
          }
          const result = validatePlan(block.input, ctx);
          if (!result.ok) {
            console.warn('[ia/chat] plano rejeitado:', result.reason);
            await send('error', { code: result.code, message: 'O plano da IA não passou na validação.', fallback: result.collected });
            return;
          }
          await send('plan', { plan: result.plan, collected: result.collected });
        } else if (final.stop_reason === 'refusal') {
          await send('error', { code: 'refusal', message: 'A IA não pôde responder.' });
          return;
        } else if (final.stop_reason === 'max_tokens') {
          await send('error', { code: 'max_tokens', message: 'A resposta da IA foi cortada.' });
          return;
        } else if (forcePlan) {
          await send('error', { code: 'no_plan', message: 'A conversa terminou sem plano.' });
          return;
        }
        await send('done', {});
      } catch (e) {
        if (ac.signal.aborted) return;
        const status = (e as { status?: number })?.status;
        console.error('[ia/chat] erro da Anthropic', status ?? '', e instanceof Error ? e.name : '');
        await send('error', { code: status === 429 ? 'upstream_busy' : 'upstream_error', message: 'A IA está indisponível agora.' });
      }
    });
    res.headers.set('Cache-Control', 'no-cache, no-transform');
    return res;
  };
}
