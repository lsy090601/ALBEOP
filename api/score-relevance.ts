import type { IncomingMessage, ServerResponse } from 'node:http';
import { runScoreRelevance } from './_lib/runScoreRelevance.ts';

// Vercel Node 런타임이 req/res에 주입하는 헬퍼만 최소 타입으로 선언한다.
interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(_req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const result = await runScoreRelevance();
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
