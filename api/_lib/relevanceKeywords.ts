// score-relevance 1차 필터링에 쓰는 분야별 "관련 법령명" 목록.
// 법률안명(BILL_NAME)에 이 법령명이 들어있으면 해당 분야의 "후보"로만 추린다.
// 이 단계는 내용을 판단하는 게 아니라 카테고리 후보를 추리는 것 — 실제 내용 확인은
// get-notice-detail로 본문을 받아온 뒤 make-card(LLM) 단계에서 한다.

export const RELEVANCE_LAW_NAMES: Record<string, string[]> = {
  노동: [
    '근로기준법',
    '최저임금법',
    '기간제및단시간근로자보호등에관한법률',
    '파견근로자보호등에관한법률',
    '산업재해보상보험법',
    '노동조합및노동관계조정법',
    '근로자퇴직급여보장법',
  ],
  주거: ['주택임대차보호법', '공인중개사법', '주택법', '주택도시기금법', '임대주택법'],
  금융: [
    '대부업등의등록및금융이용자보호에관한법률',
    '서민의금융생활지원에관한법률',
    '신용정보의이용및보호에관한법률',
  ],
  교육: ['고등교육법', '초중등교육법', '평생교육법'],
  '세금·보험': ['소득세법', '국민건강보험법', '고용보험법', '국민연금법', '조세특례제한법'],
};

export interface CategoryMatch {
  category: string;
  matchedLawNames: string[];
}

/** 띄어쓰기를 제거해 "△△법 일부개정법률안" 형태의 표기 차이를 흡수한다. */
function normalize(text: string): string {
  return text.replace(/\s+/g, '');
}

/** 법률안명에 포함된 법령명을 분야별로 찾아 가장 많이 매칭된 분야 하나를 반환한다. */
export function matchCategory(billName: string): CategoryMatch | null {
  const normalizedBillName = normalize(billName);
  let best: CategoryMatch | null = null;

  for (const [category, lawNames] of Object.entries(RELEVANCE_LAW_NAMES)) {
    const matchedLawNames = lawNames.filter((lawName) => normalizedBillName.includes(lawName));
    if (matchedLawNames.length === 0) continue;
    if (!best || matchedLawNames.length > best.matchedLawNames.length) {
      best = { category, matchedLawNames };
    }
  }

  return best;
}

/** 후보 선정 단계라 점수는 낮게: 1개 매칭=0.3, 2개 이상 매칭=0.4 */
export function scoreFromMatchCount(count: number): number {
  return count >= 2 ? 0.4 : 0.3;
}
