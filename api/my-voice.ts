import type { IncomingMessage, ServerResponse } from 'node:http';
import { runMyVoice } from './_lib/runMyVoice.ts';

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const profileId = url.searchParams.get('profile_id');
    if (!profileId) {
      res.status(400).json({ ok: false, error: 'profile_id는 필수예요.' });
      return;
    }

    const entries = await runMyVoice(profileId);
    res.status(200).json({ ok: true, entries });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
