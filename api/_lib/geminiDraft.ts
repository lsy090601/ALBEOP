// draft-opinion 전용 Gemini 호출: 인터뷰 전체 대화를 바탕으로 의견서 초안을 구조화해서 만든다.
// 공통 로직은 gemini.ts(callGeminiJson)를 재사용한다.

import { callGeminiJson, GeminiApiError, type GeminiModel } from './gemini.ts';
import type { InterviewTurn } from './geminiInterview.ts';

export interface DraftOpinionResult {
  title: string;
  related_clause: string;
  situation: string;
  concern: string;
  suggestion: string;
  draft_text: string;
}

const DRAFT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    related_clause: { type: 'STRING' },
    situation: { type: 'STRING' },
    concern: { type: 'STRING' },
    suggestion: { type: 'STRING' },
    draft_text: { type: 'STRING' },
  },
  required: ['title', 'related_clause', 'situation', 'concern', 'suggestion', 'draft_text'],
} as const;

function formatInterview(turns: InterviewTurn[]): string {
  if (turns.length === 0) return '(대화 없음)';
  return turns.map((t, i) => `${i + 1}. 질문: ${t.question}\n   답변: ${t.answer}`).join('\n');
}

function buildDraftPrompt(params: {
  billName: string;
  mainContent: string;
  proposalReason: string | null;
  stance: string;
  interview: InterviewTurn[];
}): string {
  const { billName, mainContent, proposalReason, stance, interview } = params;

  return `당신은 입법예고 시민 의견서 초안을 작성하는 에이전트입니다. 아래 법안 원문과
사용자와의 인터뷰 대화를 바탕으로, 국회에 제출할 수 있는 의견서 초안을 만드세요.

[법률안명]
${billName}

[제안이유 및 주요내용 원문]
${mainContent}
${proposalReason ? `\n[제안이유 요약]\n${proposalReason}` : ''}

[사용자 입장]
${stance}

[인터뷰 대화 전체]
${formatInterview(interview)}

[작성 항목]
- title: 의견 제목 (의견 내용을 압축한 한 문장)
- related_clause: 원문에서 이 의견과 관련된 조항·내용을 짧게 인용하거나 요약
- situation: 당사자 경험 — 인터뷰 답변을 바탕으로 사용자가 처한 상황을 정리
- concern: 의견 내용 — 사용자의 입장("${stance}")을 뒷받침하는 구체적인 의견 문장
- suggestion: 대안 제안 — 인터뷰에서 나온 내용을 바탕으로 한 구체적인 제안
- draft_text: 위 항목들을 자연스러운 글 한 편으로 이어 쓴 최종 의견서 전문

[안전 규칙 — 반드시 지키세요]
- SP-1: 인터뷰 대화에 없는 내용을 지어내지 마세요. 사용자가 말하지 않은 구체적 사실·수치를
  추가하지 말고, 정보가 부족한 항목은 대화 범위 안에서만 서술하세요.
- SP-2 확장: 입장이 찬성이든 우려든 수정이든 항상 같은 성실도로 초안을 작성하세요.
  특정 입장이라고 해서 더 짧거나 성의 없이 쓰지 마세요.
- 정당이나 정치인의 이름을 언급하거나 정치적으로 평가하지 마세요 (SP-5).

반드시 지정된 JSON 스키마로만 응답하세요.`;
}

export async function draftOpinionText(
  apiKey: string,
  params: {
    billName: string;
    mainContent: string;
    proposalReason: string | null;
    stance: string;
    interview: InterviewTurn[];
  },
  model: GeminiModel = 'flash-lite',
): Promise<DraftOpinionResult> {
  const parsed = (await callGeminiJson(
    apiKey,
    model,
    buildDraftPrompt(params),
    DRAFT_SCHEMA,
  )) as unknown as DraftOpinionResult;

  const requiredFields: (keyof DraftOpinionResult)[] = [
    'title',
    'related_clause',
    'situation',
    'concern',
    'suggestion',
    'draft_text',
  ];
  const missing = requiredFields.filter((f) => typeof parsed[f] !== 'string' || !parsed[f].trim());
  if (missing.length > 0) {
    throw new GeminiApiError(
      '[초안] 실패 · 필수 항목 누락',
      `missing fields: ${missing.join(', ')}; text=${JSON.stringify(parsed).slice(0, 300)}`,
    );
  }

  return parsed;
}
