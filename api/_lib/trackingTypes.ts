// P6/P7 읽기 전용 API(my-voice, notifications)가 함께 쓰는 최소 테이블 타입.
// src/types/database.ts와 필드가 같아야 하지만, api/_lib는 프론트 코드를 import하지 않는
// 기존 관례를 따라 여기 별도로 둔다.

export interface Notice {
  id: string;
  bill_id: string;
  committee: string | null;
  propose_date: string | null;
  notice_end: string | null;
  proposal_reason: string | null;
  main_content: string | null;
  current_law_text: string | null;
  source_url: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Card {
  id: string;
  notice_id: string;
  category: string | null;
  relevance_score: number | null;
  relevance_reason: string | null;
  easy_title: string | null;
  one_line: string | null;
  before_text: string | null;
  after_text: string | null;
  pros: string[] | null;
  cons: string[] | null;
  created_at: string;
}

export interface Opinion {
  id: string;
  user_id: string;
  notice_id: string;
  stance: string | null;
  status: string;
  interview: { question: string; answer: string }[] | null;
  draft_text: string | null;
  summary: Record<string, string | undefined> | null;
  submitted: boolean;
  last_tracking_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string | null;
  message: string | null;
  related_notice_id: string | null;
  related_opinion_id: string | null;
  is_read: boolean;
  created_at: string;
}
