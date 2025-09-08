// src/pages/CharacterShowcase.jsx
export default function CharacterShowcase() {
  // 추후: 로아 API/인벤 스크래핑, 장비/보석/코디, 투표/갤러리 등
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">캐릭터 자랑</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        디코 닉네임으로 캐릭터 프로필을 가져오고, 장비/보석/아바타 코디를 자랑해보세요. (기획중)
      </p>
      <div className="mt-6 p-6 border rounded-xl dark:border-neutral-700">
        <p className="opacity-70">🧑‍🎮 준비 중…</p>
      </div>
    </div>
  );
}