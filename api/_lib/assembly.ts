// 열린국회정보 "진행중 입법예고" API 호출 + 응답 파싱

const ASSEMBLY_API_URL = 'https://open.assembly.go.kr/portal/openapi/nknalejkafmvgzmpt';
const API_ID = 'nknalejkafmvgzmpt';
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 안전장치: 최대 2000건까지만 페이징

export interface AssemblyNoticeRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NAME?: string;
  AGE?: string;
  PROPOSER_KIND_CD?: string;
  CURR_COMMITTEE?: string;
  NOTI_ED_DT?: string;
  LINK_URL?: string;
  PROPOSER?: string;
  CURR_COMMITTEE_ID?: string;
  [key: string]: unknown;
}

interface AssemblyHeadResult {
  CODE: string;
  MESSAGE: string;
}

interface AssemblyHeadBlock {
  list_total_count?: number;
  RESULT?: AssemblyHeadResult;
}

interface AssemblyEnvelopeItem {
  head?: AssemblyHeadBlock[];
  row?: AssemblyNoticeRow[];
}

/** 수집 실패 사유를 구분해서 담는 에러. message는 agent_logs에 그대로 기록된다. */
export class AssemblyApiError extends Error {
  reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = 'AssemblyApiError';
    this.reason = reason;
  }
}

async function fetchPage(
  apiKey: string,
  pIndex: number,
): Promise<{ rows: AssemblyNoticeRow[]; totalCount: number }> {
  const url = new URL(ASSEMBLY_API_URL);
  url.searchParams.set('KEY', apiKey);
  url.searchParams.set('Type', 'json');
  url.searchParams.set('pIndex', String(pIndex));
  url.searchParams.set('pSize', String(PAGE_SIZE));

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    throw new AssemblyApiError(
      '[수집] 실패 · 응답 없음',
      `network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (contentType.includes('xml') || text.trimStart().startsWith('<')) {
    throw new AssemblyApiError(
      '[수집] 실패 · XML 응답 (Type=json 파라미터 확인 필요)',
      `content-type=${contentType}, body head=${text.slice(0, 200)}`,
    );
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch (err) {
    throw new AssemblyApiError(
      '[수집] 실패 · 응답 없음',
      `JSON parse error: ${err instanceof Error ? err.message : String(err)}; body head=${text.slice(0, 200)}`,
    );
  }

  const envelope = json[API_ID];
  if (!Array.isArray(envelope)) {
    // 인증 실패 등은 보통 {"RESULT": {"CODE": "...", "MESSAGE": "..."}} 형태로 온다.
    const result = json.RESULT as AssemblyHeadResult | undefined;
    throw new AssemblyApiError(
      '[수집] 실패 · 응답 없음',
      result
        ? `${result.CODE}: ${result.MESSAGE}`
        : `unexpected response shape: ${text.slice(0, 200)}`,
    );
  }

  const items = envelope as AssemblyEnvelopeItem[];
  const headBlock = items.find((item) => item.head)?.head;
  const resultInfo = headBlock?.find((h) => h.RESULT)?.RESULT;
  const totalCount =
    headBlock?.find((h) => typeof h.list_total_count === 'number')?.list_total_count ?? 0;

  if (resultInfo && resultInfo.CODE !== 'INFO-000') {
    throw new AssemblyApiError(
      '[수집] 실패 · 응답 없음',
      `${resultInfo.CODE}: ${resultInfo.MESSAGE}`,
    );
  }

  const rows = items.find((item) => item.row)?.row ?? [];
  return { rows, totalCount };
}

/** pSize=100 기준으로 필요한 만큼 페이징하며 전체 행을 모은다. */
export async function fetchAllNotices(apiKey: string): Promise<AssemblyNoticeRow[]> {
  const all: AssemblyNoticeRow[] = [];
  let pIndex = 1;

  while (pIndex <= MAX_PAGES) {
    const { rows, totalCount } = await fetchPage(apiKey, pIndex);
    all.push(...rows);
    if (rows.length < PAGE_SIZE || all.length >= totalCount) break;
    pIndex += 1;
  }

  return all;
}
