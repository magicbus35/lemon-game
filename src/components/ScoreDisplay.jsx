import React from "react";

const ScoreDisplay = ({ score }) => {
  return (
    <div className="mb-2 text-lg font-semibold">
      점수: <span className="text-green-600">{score}</span>
    </div>
  );
};

export default ScoreDisplay;
