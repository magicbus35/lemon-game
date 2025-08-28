// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url  = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;

if (!supabase) {
  console.warn("[supabase] URL 또는 ANON 키가 누락되었습니다. .env.local을 확인하세요.");
}
