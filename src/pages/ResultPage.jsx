// src/pages/ResultPage.jsx
import React from "react";

export default function ResultPage() {
  return (
    <div className="max-w-[800px] mx-auto px-4">
      <h1 className="text-3xl font-bold mb-4">📊 결과/보조 페이지</h1>

      <p className="text-gray-700 leading-relaxed">
        이 페이지는 추후 <b>추가 기능</b>을 위한 공간입니다.
      </p>

      <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
        <li>예: 최근 24/168시간 시간대별 플레이 통계 그래프</li>
        <li>예: 난이도 옵션 (보드 크기 / 제한 시간) 선택</li>
        <li>예: 다국어(i18n) 지원 설정</li>
      </ul>

      <p className="mt-6 text-sm text-gray-500">
        💡 현재는 임시 보조 페이지입니다. <br />
        추후 업데이트에서 더 많은 통계 및 기능이 추가될 예정입니다.
      </p>
    </div>
  );
}
