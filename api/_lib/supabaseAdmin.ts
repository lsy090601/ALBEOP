import { createClient } from '@supabase/supabase-js';

// 서버 전용 클라이언트: service role 키로 RLS를 우회해 notices/agent_logs에 쓴다.
// VITE_SUPABASE_URL은 비밀값이 아니라(프론트에도 노출됨) 서버에서도 그대로 재사용한다.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing server Supabase environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
