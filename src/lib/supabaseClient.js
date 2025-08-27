import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;

// 임시 로그(연결 확인용) — 나중에 지워도 됨
// eslint-disable-next-line no-console
console.log("[supabase] URL:", url, "KEY:", anon ? "OK" : "MISSING");
