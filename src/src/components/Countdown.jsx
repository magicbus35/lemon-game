import React from "react";

const Countdown = ({ countdown }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 select-none">
      <p className="text-white text-6xl font-bold">{countdown}</p>
    </div>
  );
};

export default Countdown;
