-- P8(에이전트 작업 로그)가 새 로그 INSERT를 실시간으로 받을 수 있도록
-- agent_logs를 Supabase Realtime publication에 추가한다. agent_logs는 이미
-- select 전체 공개 정책이 있어(0002), 구독 수신 권한도 별도 정책 없이 그대로 적용된다.
alter publication supabase_realtime add table agent_logs;
