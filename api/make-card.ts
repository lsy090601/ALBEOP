import type { IncomingMessage, ServerResponse } from 'node:http';
import { runMakeCard } from './_lib/runMakeCard.ts';
import type { GeminiModel } from './_lib/gemini.ts';

// Vercel Node 런타임이 req/res에 주입하는 헬퍼만 최소 타입으로 선언한다.
interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    // model=flash는 RPM 5(=최소 12초 간격) 전용 — 시연용으로 소수 카드만 처리할 때 limit과 함께 쓴다.
    const model: GeminiModel = url.searchParams.get('model') === 'flash' ? 'flash' : 'flash-lite';
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    const result = await runMakeCard({ model, limit });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
