import type { IncomingMessage, ServerResponse } from 'node:http';
import { runDraftOpinion } from './_lib/runDraftOpinion.ts';
import { readJsonBody } from './_lib/readJsonBody.ts';
import type { GeminiModel } from './_lib/gemini.ts';

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

interface DraftOpinionBody {
  notice_id?: string;
  profile_id?: string;
  opinion_id?: string;
  model?: GeminiModel;
  /** 제공되면 Gemini를 다시 부르지 않고 이 텍스트를 그대로 draft_text에 저장한다("직접 수정하기" 저장). */
  draft_text?: string;
  /** true면 이미 확정된 초안이 있어도 캐시를 쓰지 않고 다시 생성한다("다시 만들기"). */
  regenerate?: boolean;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const body = await readJsonBody<DraftOpinionBody>(req);
    if (!body.opinion_id && !(body.notice_id && body.profile_id)) {
      res.status(400).json({ ok: false, error: 'opinion_id 또는 (notice_id + profile_id)가 필요해요.' });
      return;
    }

    const result = await runDraftOpinion({
      noticeId: body.notice_id,
      profileId: body.profile_id,
      opinionId: body.opinion_id,
      model: body.model,
      manualDraftText: body.draft_text,
      regenerate: body.regenerate,
    });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
