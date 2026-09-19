import type { IncomingMessage, ServerResponse } from 'node:http';
import { runExplainImpact } from './_lib/runExplainImpact.ts';
import type { GeminiModel } from './_lib/gemini.ts';

// Vercel Node 런타임이 req/res에 주입하는 헬퍼만 최소 타입으로 선언한다.
interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const cardId = url.searchParams.get('card_id') ?? undefined;
    const profileId = url.searchParams.get('profile_id') ?? undefined;
    const model: GeminiModel = url.searchParams.get('model') === 'flash' ? 'flash' : 'flash-lite';

    const result = await runExplainImpact({ cardId, profileId, model });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
