import type { IncomingMessage, ServerResponse } from 'node:http';
import { runFetchNotifications, runMarkNotificationRead } from './_lib/runNotifications.ts';
import { readJsonBody } from './_lib/readJsonBody.ts';

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

interface MarkReadBody {
  id?: string;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    if (req.method === 'POST') {
      const body = await readJsonBody<MarkReadBody>(req);
      if (!body.id) {
        res.status(400).json({ ok: false, error: 'id는 필수예요.' });
        return;
      }
      await runMarkNotificationRead(body.id);
      res.status(200).json({ ok: true });
      return;
    }

    const url = new URL(req.url ?? '', 'http://localhost');
    const profileId = url.searchParams.get('profile_id');
    if (!profileId) {
      res.status(400).json({ ok: false, error: 'profile_id는 필수예요.' });
      return;
    }

    const entries = await runFetchNotifications(profileId);
    res.status(200).json({ ok: true, entries });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
