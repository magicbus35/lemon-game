import React from "react";

const ScoreDisplay = ({ score }) => {
  return (
    <div className="bg-white shadow rounded-lg px-8 py-4 text-center">
      <p className="text-gray-500 text-lg">점수</p>
      <p className="text-3xl font-bold text-green-600">{score}</p>
    </div>
  );
};

export default ScoreDisplay;
