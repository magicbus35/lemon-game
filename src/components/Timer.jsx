// src/components/Timer.jsx
import React from "react";

export default function Timer({ timeLeft }) {
  const min = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const sec = String(timeLeft % 60).padStart(2, "0");
  return (
    <div className="px-4 py-2 rounded-lg border text-lg font-bold">
      남은 시간: <span className="text-red-500">{min}:{sec}</span>
    </div>
  );
}
