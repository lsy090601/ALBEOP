// 열린국회정보 "법률안 제안이유 및 주요내용" API(BPMBILLSUMMARY) 호출 + 응답 파싱

const BPMBILLSUMMARY_URL = 'https://open.assembly.go.kr/portal/openapi/BPMBILLSUMMARY';

interface BpmBillSummaryRow {
  SUMMARY?: string;
  [key: string]: unknown;
}

interface BpmBillSummaryHeadBlock {
  RESULT?: { CODE: string; MESSAGE: string };
}

interface BpmBillSummaryEnvelopeItem {
  head?: BpmBillSummaryHeadBlock[];
  row?: BpmBillSummaryRow[];
}

/** 상세 조회 실패 사유를 구분해서 담는 에러. message는 agent_logs에 그대로 기록된다. */
export class BillSummaryApiError extends Error {
  reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = 'BillSummaryApiError';
    this.reason = reason;
  }
}

const SUMMARY_HEADER = /^\s*제안이유(\s*및\s*주요내용)?\s*/;
const PROPOSAL_REASON_MAX = 200;

/** SUMMARY 본문에서 머리말을 떼고 앞 1~2문장(최대 200자)만 뽑아 제안이유 요약으로 쓴다. */
export function extractProposalReason(summary: string): string {
  const body = summary.replace(SUMMARY_HEADER, '').replace(/\s+/g, ' ').trim();
  // "1.5배"처럼 숫자 사이 마침표는 문장 끝으로 보지 않도록 마침표 뒤 공백/끝에서만 자른다.
  const sentences = body.match(/[^.]+?\.(?=\s|$)/g) ?? [body];
  const reason =
    sentences
      .slice(0, 2)
      .map((s) => s.trim())
      .join(' ') || body;
  return reason.length > PROPOSAL_REASON_MAX ? `${reason.slice(0, PROPOSAL_REASON_MAX)}…` : reason;
}

/**
 * 의안번호(BILL_NO)로 제안이유·주요내용을 조회한다.
 * 아직 국회 시스템에 요약이 등록되지 않은 의안이면 빈 문자열을 돌려준다(정상 케이스).
 */
export async function fetchBillSummary(apiKey: string, billNo: string): Promise<string> {
  const url = new URL(BPMBILLSUMMARY_URL);
  url.searchParams.set('KEY', apiKey);
  url.searchParams.set('Type', 'json');
  url.searchParams.set('pIndex', '1');
  url.searchParams.set('pSize', '5');
  url.searchParams.set('BILL_NO', billNo);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    throw new BillSummaryApiError(
      '[상세] 실패 · 응답 없음',
      `network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (contentType.includes('xml') || text.trimStart().startsWith('<')) {
    throw new BillSummaryApiError(
      '[상세] 실패 · XML 응답 (Type=json 파라미터 확인 필요)',
      `content-type=${contentType}, body head=${text.slice(0, 200)}`,
    );
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch (err) {
    throw new BillSummaryApiError(
      '[상세] 실패 · 응답 없음',
      `JSON parse error: ${err instanceof Error ? err.message : String(err)}; body head=${text.slice(0, 200)}`,
    );
  }

  // 아직 요약이 등록되지 않은 의안: {"RESULT": {"CODE": "INFO-200", ...}}
  if ('RESULT' in json) {
    const result = json.RESULT as { CODE: string; MESSAGE: string };
    if (result.CODE === 'INFO-200') return '';
    throw new BillSummaryApiError('[상세] 실패 · 응답 없음', `${result.CODE}: ${result.MESSAGE}`);
  }

  const envelope = json.BPMBILLSUMMARY;
  if (!Array.isArray(envelope)) {
    throw new BillSummaryApiError(
      '[상세] 실패 · 응답 없음',
      `unexpected response shape: ${text.slice(0, 200)}`,
    );
  }

  const items = envelope as BpmBillSummaryEnvelopeItem[];
  const rows = items.find((item) => item.row)?.row ?? [];
  return rows
    .map((row) => row.SUMMARY ?? '')
    .filter(Boolean)
    .join(' ');
}
