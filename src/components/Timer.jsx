import React from "react";

const Timer = ({ timeLeft }) => {
  return (
    <div className="bg-white shadow rounded-lg px-8 py-4 text-center">
      <p className="text-gray-500 text-lg">남은 시간</p>
      <p
        className={`text-3xl font-bold ${
          timeLeft > 10 ? "text-green-600" : "text-red-600"
        }`}
      >
        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
      </p>
    </div>
  );
};

export default Timer;
