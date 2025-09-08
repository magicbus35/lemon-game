// src/pages/TodayCard.jsx
export default function TodayCard() {
  // 추후: 하루 1회 뽑기(로컬 키/날짜 체크) + 카드 데이터/연출
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">오늘의 카드</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        하루에 한 번 운세/버프 카드를 뽑아보세요. (기획중)
      </p>
      <div className="mt-6 p-6 border rounded-xl dark:border-neutral-700">
        <p className="opacity-70">🃏 준비 중…</p>
      </div>
    </div>
  );
}
