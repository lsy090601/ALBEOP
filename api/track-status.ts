import type { IncomingMessage, ServerResponse } from 'node:http';
import { runDemoAdvanceTracking, runTrackStatus } from './_lib/runTrackStatus.ts';

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');

    // 데모 패널 "시간경과(위원회심사)" 전용 경로 — 실제 ALLBILLV2 호출 없이 강제 진행.
    const demoAdvanceProfileId = url.searchParams.get('demo_advance_profile_id');
    if (demoAdvanceProfileId) {
      const result = await runDemoAdvanceTracking(demoAdvanceProfileId);
      res.status(200).json({ ok: true, ...result });
      return;
    }

    const opinionId = url.searchParams.get('opinion_id') ?? undefined;
    const result = await runTrackStatus({ opinionId });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
