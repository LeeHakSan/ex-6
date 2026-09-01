import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (SUPABASE_URL.includes('YOUR-PROJECT') || SUPABASE_ANON_KEY.includes('YOUR-ANON')) {
  window.addEventListener('DOMContentLoaded', () => {
    const warn = document.createElement('div');
    warn.className = 'config-warning';
    warn.textContent = 'js/supabaseClient.js에 실제 Supabase URL과 anon key를 입력해야 앱이 동작합니다.';
    document.body.prepend(warn);
  });
}
