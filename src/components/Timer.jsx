import React from "react";

const Timer = ({ timeLeft }) => {
  return (
    <div className="mb-4 text-lg font-semibold">
      남은 시간:{" "}
      <span className="text-red-600">
        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
      </span>
    </div>
  );
};

export default Timer;
