import React from "react";

interface ProgressProps {
  value: number;
  className?: string;
  payload?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className,
  payload,
}) => {
  return (
    <div
      className={`w-full bg-gray rounded-full h-6 relative text-white ${className}`}
    >
      <div
        className="absolute inset-0 bg-primary h-full rounded-full text-sm"
        style={{ width: `${value}%` }}
      />
      <div className="absolute inset-0 text-center text-xs flex items-center justify-center overflow-hidden">
        {payload}
      </div>
    </div>
  );
};
