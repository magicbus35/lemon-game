// src/components/Countdown.jsx
import React from "react";

export default function Countdown({ countdown }) {
  if (!Number.isInteger(countdown)) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="text-white text-7xl font-bold animate-pulse">
        {countdown}
      </div>
    </div>
  );
}
