// src/pages/HomePage.jsx
import React from "react";

export default function HomePage() {
  return (
    <div className="max-w-[800px] mx-auto px-4">
      <h1 className="text-3xl font-bold mb-4">🍋 레몬게임 규칙</h1>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
        <li>보드는 <b>10×17</b> 크기, 칸에는 1~9 숫자가 랜덤으로 채워집니다.</li>
        <li>마우스 <b>드래그</b> 또는 모바일 <b>두 지점 탭</b>으로 직사각형 선택.</li>
        <li>선택 영역의 합이 <b>정확히 10</b>이면 그 칸들이 제거됩니다.</li>
        <li>점수 = 선택 칸 수 + <b>레몬칸(+4)</b>.</li>
        <li>레몬칸은 매 보드 리셋마다 <b>정확히 10칸</b> 랜덤 배치.</li>
        <li><b>120초 제한 시간</b> 안에 점수를 최대화하세요.</li>
        <li>정답이 없으면 보드가 즉시 리셋됩니다.</li>
        <li>타임업 시 놓친 정답이 <span className="text-red-500">빨간 테두리</span>로 표시됩니다.</li>
      </ul>
      <p className="mt-6 text-gray-600 text-sm">💡 모바일에서 화면 폭에 따라 셀 크기가 자동 조절됩니다.</p>
    </div>
  );
}
