// agent_logs.reason에 원문 HTTP/JSON 에러를 그대로 저장하지 않고, 사용자가 읽을 수 있는
// 짧은 한국어 문구로 다듬는다. 원문은 잃지 않도록 호출하는 쪽에서 console.error로 따로 남긴다.

export function humanizeReason(raw: string): string {
  if (/HTTP 429/.test(raw) || /rate.?limit/i.test(raw) || /quota/i.test(raw)) {
    return '요청이 일시적으로 몰려 처리 지연, 자동 재시도했지만 실패했어요';
  }
  if (/network error/i.test(raw)) {
    return '네트워크 연결이 불안정해서 응답을 받지 못했어요';
  }
  if (/JSON parse error|JSON 파싱/i.test(raw)) {
    return '응답 형식이 예상과 달라 처리하지 못했어요';
  }
  if (/XML 응답|content-type=.*xml/i.test(raw)) {
    return '예상과 다른 형식(XML)의 응답을 받았어요';
  }
  if (/HTTP 5\d{2}/.test(raw)) {
    return '외부 서비스에 일시적인 오류가 있었어요';
  }
  if (/HTTP 4\d{2}/.test(raw)) {
    return '요청이 거부됐어요 (설정 확인이 필요해요)';
  }
  if (/finishReason|no candidate text/i.test(raw)) {
    return 'AI 응답이 비어 있었어요';
  }
  if (/duplicate key|violates.*constraint/i.test(raw)) {
    return '이미 처리된 항목이라 건너뛰었어요';
  }
  if (/^[A-Z]+-\d+:/.test(raw)) {
    return '외부 API 응답에 문제가 있었어요';
  }
  // 알려진 패턴이 아니면 원문 전체를 노출하지 않고 앞부분만 짧게 보여준다.
  return raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
}
