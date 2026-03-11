"use client";

import React from "react";
import { motion } from "framer-motion";

export default function RainbowLightStrip({ loading }: { loading: boolean }) {
  const colors = [
    "from-red-500 to-orange-500",
    "from-orange-500 to-yellow-500",
    "from-yellow-500 to-green-500",
    "from-green-500 to-blue-500",
    "from-blue-500 to-indigo-500",
    "from-indigo-500 to-purple-500",
    "from-purple-500 to-pink-500",
  ];

  return (
    <div className="">
      <div
        className={`relative h-4 w-full overflow-hidden ${
          !loading && "bg-gray-400"
        }`}
      >
        {loading &&
          colors.map((gradient, index) => (
            <motion.div
              key={index}
              className={`absolute inset-0 bg-gradient-to-r ${gradient}`}
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{
                repeat: Infinity,
                repeatType: "loop",
                duration: 2,
                ease: "linear",
                delay: index * 0.5,
              }}
            />
          ))}

        {loading && (
          <motion.div
            className="absolute inset-0 bg-background"
            animate={{
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  );
}
