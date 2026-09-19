import type { IncomingMessage, ServerResponse } from 'node:http';
import { runFetchOpinion } from './_lib/runOpinion.ts';

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const opinionId = url.searchParams.get('opinion_id');
    if (!opinionId) {
      res.status(400).json({ ok: false, error: 'opinion_id는 필수예요.' });
      return;
    }

    const entry = await runFetchOpinion(opinionId);
    if (!entry) {
      res.status(404).json({ ok: false, error: '의견을 찾을 수 없어요.' });
      return;
    }

    res.status(200).json({ ok: true, ...entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
