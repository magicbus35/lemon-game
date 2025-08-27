import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SupaTest() {
  const [status, setStatus] = useState("초기화 중...");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setStatus("❌ supabase 클라이언트가 없습니다 (ENV 미설정/재시작 필요)");
        return;
      }
      try {
        setStatus("🔎 scores 테이블에서 1건 조회중...");
        const { data, error } = await supabase
          .from("scores")
          .select("name,score")
          .limit(1);
        if (error) {
          setStatus("❌ 조회 에러: " + error.message);
        } else {
          setRows(data || []);
          setStatus("✅ 연결 OK (error: null)");
        }
      } catch (e) {
        setStatus("❌ 예외 발생: " + e.message);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Supabase 연결 테스트</h1>
      <p>{status}</p>
      <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(rows, null, 2)}
      </pre>
      <p style={{ color: "#666" }}>
        ※ 정상이라면 status가 <b>"✅ 연결 OK"</b>로 보이고, 데이터가 없으면 <code>[]</code>가 표시됩니다.
      </p>
    </div>
  );
}
