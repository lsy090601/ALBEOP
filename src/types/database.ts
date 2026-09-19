// supabase/migrations/0002_reset_to_spec.sql 기준 타입 정의

// profiles 테이블
export interface Profile {
  id: string;
  age_group: string | null;
  activities: string[] | null;
  weekly_hours: number | null;
  housing_type: string | null;
  /** 1년 안에 새로 주거 계약(전월세 등)을 맺을 계획이 있는지 */
  housing_contract_plan: boolean;
  finance: string[] | null;
  interests: string[] | null;
  notify_time: string;
  notify_limit_per_day: number;
  created_at: string;
  /** DB 컬럼 아님 — UI 표시용 (데모 페르소나 이름) */
  display_name?: string;
}

// notices.raw_data에 보관되는 수집 API 원본 백업 정보
export interface NoticeRawData {
  [key: string]: unknown;
}

// notices 테이블 (원본 입법예고 데이터)
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
  raw_data: NoticeRawData | null;
  created_at: string;
}

// cards 테이블 (에이전트가 notices를 가공한 개인화 카드)
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

/** notices + cards를 조인한 화면 표시용 묶음 (DB 테이블 아님) */
export interface NoticeCard {
  notice: Notice;
  card: Card;
}

export type OpinionStatus = 'draft' | 'draft_confirmed' | 'submitted';

export interface OpinionInterviewTurn {
  question: string;
  answer: string;
}

export interface OpinionSummary {
  title?: string;
  related_clause?: string;
  situation?: string;
  concern?: string;
  suggestion?: string;
}

// opinions 테이블
export interface Opinion {
  id: string;
  user_id: string;
  notice_id: string;
  stance: string | null;
  status: OpinionStatus;
  interview: OpinionInterviewTurn[] | null;
  draft_text: string | null;
  summary: OpinionSummary | null;
  submitted: boolean;
  last_tracking_status: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'deadline' | 'progress' | 'agent';

// notifications 테이블
export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType | null;
  message: string | null;
  related_notice_id: string | null;
  related_opinion_id: string | null;
  is_read: boolean;
  created_at: string;
}

export type AgentLogStep = '수집' | '선별' | '요약' | '완료';

// agent_logs 테이블
export interface AgentLog {
  id: string;
  run_at: string;
  step: AgentLogStep | string | null;
  notice_id: string | null;
  message: string | null;
  reason: string | null;
  included: boolean | null;
  created_at: string;
}
