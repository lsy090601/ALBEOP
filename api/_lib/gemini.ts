// Gemini 호출 공통 로직: 모델 선택, 페이싱용 상수, 429 지수 백오프, JSON 강제 호출.
// make-card(judgeAndDraftCard)와 explain-impact(judgeCardImpact, geminiImpact.ts)가 함께 쓴다.

import { sleep } from './sleep.ts';

export type GeminiModel = 'flash-lite' | 'flash';

// Google AI Studio에서 확인한 실제 분당 요청 한도(RPM) 기준.
// flash-lite: RPM 15 → 기본 페이싱(4.2~4.5초)과 맞물려 사용.
// flash: RPM 5 → 최소 12초 간격 강제, 시연용 소수 건 처리 전용.
const MODEL_IDS: Record<GeminiModel, string> = {
  'flash-lite': 'gemini-3.5-flash-lite',
  flash: 'gemini-3.6-flash',
};

function geminiUrl(model: GeminiModel): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_IDS[model]}:generateContent`;
}

/** Gemini 호출/파싱 실패 사유를 구분해서 담는 에러. message는 agent_logs에 그대로 기록된다. */
export class GeminiApiError extends Error {
  reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = 'GeminiApiError';
    this.reason = reason;
  }
}

// 429(할당량 초과)에만 지수 백오프로 재시도한다. 그 외 실패(네트워크/4xx/5xx)는 즉시 실패 처리.
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 최대 3회 재시도

async function fetchGeminiWithBackoff(
  url: string,
  body: unknown,
): Promise<{ status: number; text: string }> {
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new GeminiApiError(
        '[분석] 실패 · 응답 없음',
        `network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const text = await response.text();
    if (response.status !== 429 || attempt >= RETRY_DELAYS_MS.length) {
      return { status: response.status, text };
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

/**
 * responseSchema로 JSON 출력을 강제해 Gemini를 호출하고, candidate의 JSON 텍스트를 파싱해 돌려준다.
 * 스키마별 필드 검증(필수값 확인 등)은 호출하는 쪽에서 한다.
 */
export async function callGeminiJson(
  apiKey: string,
  model: GeminiModel,
  prompt: string,
  responseSchema: object,
): Promise<Record<string, unknown>> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.3,
    },
  };

  const { status, text } = await fetchGeminiWithBackoff(`${geminiUrl(model)}?key=${apiKey}`, body);

  if (status !== 200) {
    throw new GeminiApiError('[분석] 실패 · 응답 없음', `HTTP ${status}: ${text.slice(0, 300)}`);
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch (err) {
    throw new GeminiApiError(
      '[분석] 실패 · JSON 파싱 실패',
      `response JSON parse error: ${err instanceof Error ? err.message : String(err)}; body head=${text.slice(0, 200)}`,
    );
  }

  const candidates = json.candidates as
    | { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
    | undefined;
  const candidateText = candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new GeminiApiError(
      '[분석] 실패 · 응답 없음',
      `no candidate text; finishReason=${candidates?.[0]?.finishReason}; raw=${text.slice(0, 300)}`,
    );
  }

  try {
    return JSON.parse(candidateText) as Record<string, unknown>;
  } catch (err) {
    throw new GeminiApiError(
      '[분석] 실패 · JSON 파싱 실패',
      `candidate JSON parse error: ${err instanceof Error ? err.message : String(err)}; text=${candidateText.slice(0, 300)}`,
    );
  }
}

// ---------- make-card 전용: 법안 관련성 판단 + 카드 초안 생성 ----------

export interface CardJudgment {
  is_relevant: boolean;
  reason: string;
  easy_title?: string;
  one_line?: string;
  pros?: string[];
  cons?: string[];
}

const CARD_JUDGMENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_relevant: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
    easy_title: { type: 'STRING' },
    one_line: { type: 'STRING' },
    pros: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 2, maxItems: 3 },
    cons: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 2, maxItems: 3 },
  },
  required: ['is_relevant', 'reason'],
} as const;

function buildCardPrompt(params: {
  billName: string;
  mainContent: string;
  proposalReason: string | null;
}): string {
  const { billName, mainContent, proposalReason } = params;

  return `당신은 사회초년생을 위한 입법예고 해설 에이전트입니다. 아래 법률안 원문을 읽고, 두 사람 중 적어도 한 명에게 실제로 생활에 영향을 미치는 법안인지 판단하세요.

[법률안명]
${billName}

[제안이유 및 주요내용 원문]
${mainContent}
${proposalReason ? `\n[제안이유 요약]\n${proposalReason}` : ''}

[판단 대상 페르소나]
1. 윤채원 — 17세, 아르바이트(주말), 가족과 함께 거주
2. 강도윤 — 25세, 정규직(입사 1년차), 월세 거주

[판단 기준]
- 위 두 사람 중 적어도 한 명의 생활(근로, 주거, 소득, 학업 등)에 실질적인 영향이 있으면 관련 있다고 판단하세요.
- 법률 용어나 제목만 비슷할 뿐 실제 생활 영향이 없다면 관련 없음으로 판단하세요.

[관련 있는 경우 작성 규칙]
- easy_title: 생활언어로 쓴 제목 (20자 내외)
- one_line: 무엇이 바뀌는지 한 문장 요약
- pros: 기대되는 점 정확히 2~3개 (절대 비워두지 마세요)
- cons: 우려되는 점 정확히 2~3개 (절대 비워두지 마세요, pros와 반드시 같은 개수)
  - 이 법안 자체에 뚜렷한 단점이 안 보여도, 시행 비용·행정 부담·제도 남용 가능성·적용 대상이
    좁아 소외되는 사람이 생길 가능성 등 일반적으로 따라오는 우려를 근거로 최소 2개를 작성하세요.
    "우려되는 점 없음"처럼 얼버무리지 말고 구체적인 문장으로 쓰세요.

[관련 없는 경우 작성 규칙]
- reason에만 짧게 이유를 쓰고, easy_title/one_line/pros/cons는 비워두세요.

[안전 규칙 — 반드시 지키세요]
- SP-1: 원문에 없는 내용을 지어내지 마세요. 원문에서 확인할 수 없는 구체적 수치·사실은
  "확인되지 않음"이라고 쓰되, pros/cons 문장 자체를 비워두는 것은 허용되지 않습니다.
- SP-2: 기대되는 점과 우려되는 점은 항상 같은 개수로 작성하세요 (편향 방지 원칙). cons가 pros보다
  적거나 비어 있는 응답은 잘못된 응답입니다.
- SP-5: 정당이나 정치인의 이름을 언급하거나 정치적으로 평가하지 마세요.

반드시 지정된 JSON 스키마로만 응답하세요.`;
}

export async function judgeAndDraftCard(
  apiKey: string,
  params: { billName: string; mainContent: string; proposalReason: string | null },
  model: GeminiModel = 'flash-lite',
): Promise<CardJudgment> {
  const parsed = (await callGeminiJson(
    apiKey,
    model,
    buildCardPrompt(params),
    CARD_JUDGMENT_SCHEMA,
  )) as unknown as CardJudgment;

  if (typeof parsed.is_relevant !== 'boolean' || typeof parsed.reason !== 'string') {
    throw new GeminiApiError(
      '[분석] 실패 · JSON 파싱 실패',
      `missing required fields in response: ${JSON.stringify(parsed).slice(0, 300)}`,
    );
  }

  // 관련 있다고 판단했는데 기대되는 점 자체가 없으면(easy_title 등도 비었을 가능성이 큼)
  // 온전한 카드를 만들 수 없는 진짜 생성 실패로 본다. cons 개수 보정은 runMakeCard에서 처리한다
  // (모델이 responseSchema의 minItems를 지키지 않고 cons를 비우는 경우가 실측상 흔해서,
  // 여기서 바로 실패시키기보다 안전한 일반 문구로 채워 SP-2를 코드로 보장하는 쪽을 택했다).
  if (parsed.is_relevant && (parsed.pros?.length ?? 0) < 2) {
    throw new GeminiApiError(
      '[분석] 실패 · 카드 정보 부족',
      `pros=${parsed.pros?.length ?? 0}; text=${JSON.stringify(parsed).slice(0, 300)}`,
    );
  }

  return parsed;
}
