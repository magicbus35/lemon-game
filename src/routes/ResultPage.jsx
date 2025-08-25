import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ResultPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const score = state?.score || 0;
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const saveRecord = () => {
    if (!name.trim()) {
      alert("닉네임을 입력해주세요!");
      return;
    }

    const records = JSON.parse(localStorage.getItem("lemonGameRecords") || "[]");
    const newRecord = { name, score, date: new Date().toLocaleString() };
    records.push(newRecord);
    localStorage.setItem("lemonGameRecords", JSON.stringify(records));
    setSaved(true);
  };

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-3xl font-bold mb-6">게임 종료!</h1>
      <p className="text-xl mb-4">
        최종 점수: <span className="text-green-600">{score}</span>
      </p>

      {!saved ? (
        <div className="flex flex-col items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="닉네임 입력"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 rounded text-center"
          />
          <button
            onClick={saveRecord}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            내 기록 등록하기
          </button>
        </div>
      ) : (
        <p className="text-green-600 mb-6 font-semibold">기록이 저장되었습니다!</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-yellow-400 rounded font-semibold"
        >
          다시 시작
        </button>
        <button
          onClick={() => navigate("/ranking")}
          className="px-4 py-2 bg-green-500 text-white rounded font-semibold"
        >
          랭킹 보기
        </button>
      </div>
    </div>
  );
};

export default ResultPage;
