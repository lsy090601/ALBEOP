// 열린국회정보 "의안정보 통합 API(ALLBILLV2)" 호출 + 응답 파싱 + 처리단계 매핑
// (fetch-notices가 쓰는 "진행중 입법예고" API와는 별개의 엔드포인트)

const ALLBILLV2_URL = 'https://open.assembly.go.kr/portal/openapi/ALLBILLV2';

export interface AllBillRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  JRCMIT_CMMT_DT?: string | null;
  JRCMIT_PROC_DT?: string | null;
  JRCMIT_PROC_RSLT?: string | null;
  LAW_CMMT_DT?: string | null;
  LAW_PRSNT_DT?: string | null;
  LAW_PROC_DT?: string | null;
  LAW_PROC_RSLT?: string | null;
  RGS_PRSNT_DT?: string | null;
  RGS_RSLN_DT?: string | null;
  RGS_CONF_RSLT?: string | null;
  PROM_LAW_NM?: string | null;
  PROM_DT?: string | null;
  PROM_NO?: string | null;
  PROC_STAGE_CD?: string | null;
  LINK_URL?: string;
  [key: string]: unknown;
}

interface AllBillHeadResult {
  CODE: string;
  MESSAGE: string;
}

interface AllBillHeadBlock {
  list_total_count?: number;
  RESULT?: AllBillHeadResult;
}

interface AllBillEnvelopeItem {
  head?: AllBillHeadBlock[];
  row?: AllBillRow[];
}

/** 조회 실패 사유를 구분해서 담는 에러. message는 agent_logs에 그대로 기록된다. */
export class BillTrackingApiError extends Error {
  reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = 'BillTrackingApiError';
    this.reason = reason;
  }
}

/**
 * BILL_NO(=notices.bill_id) 기준으로 의안 처리 현황을 조회한다.
 * 아직 의안정보시스템에 등록되지 않은 경우(예: 막 입법예고만 된 상태)는 INFO-200으로 오며,
 * 이때는 실패가 아니라 "아직 조회할 데이터가 없음"으로 보고 null을 돌려준다.
 */
export async function fetchBillTracking(
  apiKey: string,
  params: { billNo: string; eraco: string },
): Promise<AllBillRow | null> {
  const url = new URL(ALLBILLV2_URL);
  url.searchParams.set('KEY', apiKey);
  url.searchParams.set('Type', 'json');
  url.searchParams.set('pIndex', '1');
  url.searchParams.set('pSize', '1');
  url.searchParams.set('ERACO', params.eraco);
  url.searchParams.set('BILL_NO', params.billNo);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    throw new BillTrackingApiError(
      '[추적] 실패 · 응답 없음',
      `network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (contentType.includes('xml') || text.trimStart().startsWith('<')) {
    throw new BillTrackingApiError(
      '[추적] 실패 · XML 응답 (Type=json 파라미터 확인 필요)',
      `content-type=${contentType}, body head=${text.slice(0, 200)}`,
    );
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch (err) {
    throw new BillTrackingApiError(
      '[추적] 실패 · 응답 없음',
      `JSON parse error: ${err instanceof Error ? err.message : String(err)}; body head=${text.slice(0, 200)}`,
    );
  }

  // 결과 없음/인증 실패 등은 {"RESULT": {"CODE": "...", "MESSAGE": "..."}} 형태로 온다.
  if ('RESULT' in json) {
    const result = json.RESULT as AllBillHeadResult;
    if (result.CODE === 'INFO-200') return null;
    throw new BillTrackingApiError('[추적] 실패 · 응답 없음', `${result.CODE}: ${result.MESSAGE}`);
  }

  const envelope = json.ALLBILLV2;
  if (!Array.isArray(envelope)) {
    throw new BillTrackingApiError(
      '[추적] 실패 · 응답 없음',
      `unexpected response shape: ${text.slice(0, 200)}`,
    );
  }

  const items = envelope as AllBillEnvelopeItem[];
  const headBlock = items.find((item) => item.head)?.head;
  const resultInfo = headBlock?.find((h) => h.RESULT)?.RESULT;
  if (resultInfo && resultInfo.CODE !== 'INFO-000') {
    if (resultInfo.CODE === 'INFO-200') return null;
    throw new BillTrackingApiError(
      '[추적] 실패 · 응답 없음',
      `${resultInfo.CODE}: ${resultInfo.MESSAGE}`,
    );
  }

  const rows = items.find((item) => item.row)?.row ?? [];
  return rows[0] ?? null;
}

// src/lib/mockData.ts의 TRACKING_STEPS와 반드시 같은 5개 문자열을 유지해야 한다
// (StatusStepper/getTrackingStepIndex가 이 문자열로 정확히 매칭한다).
const RESULT_KEYWORDS = /가결|부결|폐기|철회|대안반영|수정가결|공포/;

/**
 * ALLBILLV2 응답을 TRACKING_STEPS의 5단계 중 하나로 매핑한다.
 * 각 단계 완료를 나타내는 날짜 필드 존재 여부를 1차 기준으로 삼고(가장 신뢰도가 높음),
 * PROC_STAGE_CD 텍스트를 보조 신호로 함께 확인한다(날짜가 비어 있는 폐기·철회 케이스 등 방어).
 */
export function mapToTrackingStatus(row: AllBillRow): string {
  const stageCd = row.PROC_STAGE_CD ?? '';

  if (row.PROM_DT || RESULT_KEYWORDS.test(row.RGS_CONF_RSLT ?? '') || RESULT_KEYWORDS.test(stageCd)) {
    return '결과';
  }
  if (row.RGS_PRSNT_DT || stageCd.includes('본회의')) {
    return '본회의';
  }
  if (row.LAW_PRSNT_DT || row.LAW_CMMT_DT || row.LAW_PROC_DT || /법사위|체계자구/.test(stageCd)) {
    return '법사위 심사';
  }
  if (row.JRCMIT_PROC_DT || row.JRCMIT_CMMT_DT || /위원회|소관위/.test(stageCd)) {
    return '위원회 심사';
  }
  return '입법예고 종료';
}

/** '결과' 단계일 때 알림 문구에 덧붙일 구체적인 처리 결과("통과"/"폐기" 등). 없으면 null. */
export function describeResult(row: AllBillRow): string | null {
  if (row.PROM_DT) return '통과';
  if (row.RGS_CONF_RSLT) return row.RGS_CONF_RSLT;
  const stageCd = row.PROC_STAGE_CD ?? '';
  const match = stageCd.match(RESULT_KEYWORDS);
  return match ? match[0] : null;
}
