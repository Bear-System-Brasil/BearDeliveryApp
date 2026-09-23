"use client";

import { TypeAnimation } from "react-type-animation";

export default function AnimatedText() {
  return (
    <TypeAnimation
      sequence={[
        "inspira",
        3000,
        "conquista",
        3000,
        "surpreende",
        3000,
        "apaixona",
        3000,
      ]}
      wrapper="span"
      speed={25}
      repeat={Infinity}
      deletionSpeed={25}
      className="bg-linear-to-r from-brand-500 to-brand-500 bg-clip-text text-transparent"
    />
  );
}
