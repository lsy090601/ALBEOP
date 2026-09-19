import type { IncomingMessage, ServerResponse } from 'node:http';
import { runInterviewOpinion } from './_lib/runInterviewOpinion.ts';
import { readJsonBody } from './_lib/readJsonBody.ts';
import type { GeminiModel } from './_lib/gemini.ts';

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

interface InterviewOpinionBody {
  notice_id?: string;
  profile_id?: string;
  stance?: string;
  answer?: string;
  model?: GeminiModel;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const body = await readJsonBody<InterviewOpinionBody>(req);
    if (!body.notice_id || !body.profile_id) {
      res.status(400).json({ ok: false, error: 'notice_id, profile_id는 필수예요.' });
      return;
    }

    const result = await runInterviewOpinion({
      noticeId: body.notice_id,
      profileId: body.profile_id,
      stance: body.stance,
      answer: body.answer,
      model: body.model,
    });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
