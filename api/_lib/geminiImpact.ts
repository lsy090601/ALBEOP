// explain-impact 전용 Gemini 호출: 법안 원문 + 프로필 필드값을 대조해 "이 사람에게 해당하는지" 판단한다.
// 모델/페이싱/재시도 등 공통 로직은 gemini.ts(callGeminiJson)를 그대로 재사용한다.

import { callGeminiJson, GeminiApiError, type GeminiModel } from './gemini.ts';

export type ImpactVerdict = '해당' | '해당없음' | '확인 필요';

export interface ImpactJudgment {
  verdict: ImpactVerdict;
  impact_text: string;
  calculation_basis: string;
}

export interface ProfileForPrompt {
  age_group: string | null;
  activities: string[] | null;
  weekly_hours: number | null;
  housing_type: string | null;
  housing_contract_plan: boolean;
  finance: string[] | null;
  interests: string[] | null;
  /** DB 컬럼이 아닌, 이번 판단에만 참고할 자유 텍스트 메모(예: 근무 요일·시간대 패턴).
   * 스키마에 없는 값이라 calculation_basis의 "실제 필드명 인용" 대상은 아니고, 보조 맥락으로만 쓰인다. */
  extra_note?: string | null;
}

const IMPACT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['해당', '해당없음', '확인 필요'] },
    impact_text: { type: 'STRING' },
    calculation_basis: { type: 'STRING' },
  },
  required: ['verdict', 'impact_text', 'calculation_basis'],
} as const;

function formatProfile(profile: ProfileForPrompt): string {
  const lines = [
    `나이대: ${profile.age_group ?? '확인되지 않음'}`,
    `활동: ${profile.activities?.length ? profile.activities.join(', ') : '확인되지 않음'}`,
    `주당 근무시간: ${profile.weekly_hours != null ? `${profile.weekly_hours}시간` : '확인되지 않음'}`,
    `주거 형태: ${profile.housing_type ?? '확인되지 않음'}`,
    `1년 내 주거 계약 예정: ${profile.housing_contract_plan ? '있음' : '없음'}`,
    `금융 상황: ${profile.finance?.length ? profile.finance.join(', ') : '확인되지 않음'}`,
    `관심 분야: ${profile.interests?.length ? profile.interests.join(', ') : '확인되지 않음'}`,
  ];
  return lines.join('\n');
}

function buildImpactPrompt(params: {
  billName: string;
  mainContent: string;
  proposalReason: string | null;
  profile: ProfileForPrompt;
}): string {
  const { billName, mainContent, proposalReason, profile } = params;

  return `당신은 입법예고 법안이 한 사람의 실제 생활에 적용되는지 판단하는 에이전트입니다.
아래 법률안 원문과 이 사람의 프로필 조건을 대조해서, 이 법안이 이 사람에게 실제로 해당하는지 판단하세요.

[법률안명]
${billName}

[제안이유 및 주요내용 원문]
${mainContent}
${proposalReason ? `\n[제안이유 요약]\n${proposalReason}` : ''}

[이 사람의 프로필]
${formatProfile(profile)}
${profile.extra_note ? `\n[추가 참고 — 프로필 항목은 아니지만 판단에 참고할 정보]\n${profile.extra_note}` : ''}

[판단 방법]
"해당"은 두 가지 경우를 모두 포함합니다 — 둘 중 하나만 맞아도 "해당"입니다.
  (a) 직접 적용: 원문에 명시된 적용 조건(예: 주 15시간 미만 근로자, 월세 거주자 등)을 이 사람이 충족함
  (b) 간접 영향: 이 사람이 법의 직접 수범자(예: 사업주, 외국인, 배우자가 있는 사람)는 아니지만,
      본인이 속한 집단(예: 근로자·세입자·가입자로서)의 비용·환경·서비스·수당에 실질적으로 영향이 있음
      (예: "사업주 대상 세액공제"라도 그 사업장에 고용된 근로자라면 근무환경 개선으로 간접 영향이 있음)
- 위 (a), (b) 어느 쪽도 아니고 이 사람의 생활과 무관하면 "해당없음"으로 판단하세요.
- 원문 자체에 적용 대상이나 조건이 불명확해서 (a)/(b)/무관 중 무엇인지 프로필 정보만으로 판단할 수 없으면
  "확인 필요"로 판단하세요. 추측으로 단정하지 마세요.
- "해당없음"은 정말 이 사람의 생활과 아무 접점이 없을 때만 쓰세요. 간접 영향이 조금이라도 있으면
  "해당"으로 판단하고, impact_text에 그게 직접 적용인지 간접 영향인지 밝히세요.

[작성 규칙]
- impact_text: 이 사람에게 하는 말투로 1~2문장. 왜 해당/해당없음/확인 필요인지 구체적으로 쓰세요.
  예: "주 15시간 미만으로 일하고 계셔서 새 기준이 적용되면 대상에 포함될 수 있어요."
- calculation_basis: 판단에 실제로 사용한 프로필 필드명과 그 값을 반드시 그대로 포함하세요.
  예: "프로필의 활동('아르바이트'), 주당 근무시간(15시간)을 기준으로 판단했어요."

[안전 규칙 — 반드시 지키세요]
- SP-1: 원문에 없는 적용 조건이나 수치를 지어내지 마세요. 원문에서 확인할 수 없으면 "확인 필요"로
  판단하고, impact_text/calculation_basis에도 "원문에 명시되지 않음"이라고 쓰세요.
- calculation_basis는 반드시 프로필의 실제 필드명과 값을 인용해야 합니다. "여러 조건을 종합했어요"처럼
  근거 없이 뭉뚱그리는 문장은 허용되지 않습니다.
- 정당이나 정치인의 이름을 언급하거나 정치적으로 평가하지 마세요.

반드시 지정된 JSON 스키마로만 응답하세요.`;
}

export async function judgeCardImpact(
  apiKey: string,
  params: {
    billName: string;
    mainContent: string;
    proposalReason: string | null;
    profile: ProfileForPrompt;
  },
  model: GeminiModel = 'flash-lite',
): Promise<ImpactJudgment> {
  const parsed = (await callGeminiJson(
    apiKey,
    model,
    buildImpactPrompt(params),
    IMPACT_SCHEMA,
  )) as unknown as ImpactJudgment;

  const validVerdicts: ImpactVerdict[] = ['해당', '해당없음', '확인 필요'];
  if (
    !validVerdicts.includes(parsed.verdict) ||
    typeof parsed.impact_text !== 'string' ||
    !parsed.impact_text ||
    typeof parsed.calculation_basis !== 'string' ||
    !parsed.calculation_basis
  ) {
    throw new GeminiApiError(
      '[분석] 실패 · JSON 파싱 실패',
      `missing/invalid fields in response: ${JSON.stringify(parsed).slice(0, 300)}`,
    );
  }

  return parsed;
}
