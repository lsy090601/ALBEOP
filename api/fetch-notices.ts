import type { IncomingMessage, ServerResponse } from 'node:http';
import { runFetchNotices } from './_lib/runFetchNotices.ts';
import { AssemblyApiError } from './_lib/assembly.ts';

// Vercel Node 런타임이 req/res에 주입하는 헬퍼만 최소 타입으로 선언한다.
interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(_req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const result = await runFetchNotices();
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AssemblyApiError) {
      res.status(502).json({ ok: false, error: err.message, detail: err.reason });
      return;
    }
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
