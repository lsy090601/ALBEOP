// interview-opinion 전용 Gemini 호출: 지금까지의 대화를 보고 다음 질문 하나를 만들거나,
// 충분히 구체화됐으면 인터뷰 종료를 신호한다. 공통 로직은 gemini.ts(callGeminiJson)를 재사용한다.

import { callGeminiJson, GeminiApiError, type GeminiModel } from './gemini.ts';

export interface InterviewTurn {
  question: string;
  answer: string;
}

export interface InterviewJudgment {
  done: boolean;
  next_question: string;
}

const INTERVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    done: { type: 'BOOLEAN' },
    next_question: { type: 'STRING' },
  },
  required: ['done', 'next_question'],
} as const;

// Gemini가 스스로 종료를 판단하되, 비용/무한루프 방지를 위한 코드 레벨 상한선.
export const MAX_INTERVIEW_TURNS = 5;
const MIN_INTERVIEW_TURNS = 3;

function formatPriorTurns(turns: InterviewTurn[]): string {
  if (turns.length === 0) return '(아직 없음 — 이번이 첫 질문입니다)';
  return turns.map((t, i) => `${i + 1}. 질문: ${t.question}\n   답변: ${t.answer}`).join('\n');
}

function buildInterviewPrompt(params: {
  billName: string;
  mainContent: string;
  impactText: string | null;
  stance: string;
  priorTurns: InterviewTurn[];
}): string {
  const { billName, mainContent, impactText, stance, priorTurns } = params;

  return `당신은 입법예고에 대한 시민 의견 작성을 돕는 인터뷰 에이전트입니다.
사용자는 아래 법안에 대해 "${stance}" 입장을 골랐습니다. 막연한 생각을 구체적인 의견으로
다듬을 수 있도록, 한 번에 질문 하나씩 순서대로 물어보세요.

[법률안명]
${billName}

[제안이유 및 주요내용 원문]
${mainContent}
${impactText ? `\n[이 사용자에게 해당하는 개인화 맥락]\n${impactText}` : ''}

[사용자 입장]
${stance}

[지금까지의 대화 (${priorTurns.length}턴 완료)]
${formatPriorTurns(priorTurns)}

[판단 방법]
- 지금까지 ${MIN_INTERVIEW_TURNS}~${MAX_INTERVIEW_TURNS}턴 정도 주고받아서 "언제부터/어떤 상황인지·무엇이 불편한지·무엇을 원하는지"가
  충분히 구체적으로 모였다면 done=true로 인터뷰를 종료하세요. next_question은 빈 문자열로 두세요.
- 아직 충분하지 않다면 done=false로 하고, next_question에 다음 질문을 정확히 하나만 담으세요.
  이전 답변을 참고해서 점점 더 구체적으로 파고드는 질문을 하세요 (예: 언제부터 그런 상황인지,
  어떤 상황에서 겪는 일인지, 무엇이 불편한지, 이 법안이 바뀌면 무엇을 원하는지).
- 한 번에 여러 질문을 묶어서 던지지 마세요.

[안전 규칙 — 반드시 지키세요]
- SP-1: 사용자가 아직 말하지 않은 내용을 질문의 전제로 지어내지 마세요. 답변에 없는 사실을
  이미 알고 있다는 듯이 질문하지 마세요.
- SP-2 확장: "${stance}" 입장이 찬성이든 우려든 수정이든 상관없이, 항상 같은 성실도로 질문하세요.
  특정 입장을 유도하거나 다른 입장보다 대충 다루지 마세요.
- 정당이나 정치인의 이름을 언급하거나 정치적으로 평가하지 마세요 (SP-5).

반드시 지정된 JSON 스키마로만 응답하세요.`;
}

export async function judgeNextInterviewStep(
  apiKey: string,
  params: {
    billName: string;
    mainContent: string;
    impactText: string | null;
    stance: string;
    priorTurns: InterviewTurn[];
  },
  model: GeminiModel = 'flash-lite',
): Promise<InterviewJudgment> {
  const parsed = (await callGeminiJson(
    apiKey,
    model,
    buildInterviewPrompt(params),
    INTERVIEW_SCHEMA,
  )) as unknown as InterviewJudgment;

  if (typeof parsed.done !== 'boolean' || typeof parsed.next_question !== 'string') {
    throw new GeminiApiError(
      '[인터뷰] 실패 · JSON 파싱 실패',
      `missing/invalid fields in response: ${JSON.stringify(parsed).slice(0, 300)}`,
    );
  }
  if (!parsed.done && !parsed.next_question.trim()) {
    throw new GeminiApiError(
      '[인터뷰] 실패 · 질문 누락',
      `done=false인데 next_question이 비어 있음: ${JSON.stringify(parsed).slice(0, 300)}`,
    );
  }

  // 코드 레벨 상한선: Gemini가 종료를 미루더라도 MAX_INTERVIEW_TURNS를 넘기지 않는다.
  if (!parsed.done && params.priorTurns.length >= MAX_INTERVIEW_TURNS) {
    return { done: true, next_question: '' };
  }

  return parsed;
}
