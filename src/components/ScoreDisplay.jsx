// src/components/ScoreDisplay.jsx
import React from "react";

export default function ScoreDisplay({ score }) {
  return (
    <div className="px-4 py-2 rounded-lg border text-lg font-bold">
      점수: <span className="text-green-600">{score}</span>
    </div>
  );
}
