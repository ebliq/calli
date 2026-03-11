import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  height?: string;
}

export function LoadingSpinner({
  size = 48,
  color = "text-blue-500",
  height = "min-h-[calc(100vh-8rem)]",
}: LoadingSpinnerProps) {
  return (
    <div className={`${height} flex items-center justify-center`}>
      <div className="flex items-center justify-center w-full h-full ">
        <Loader2 className={`animate-spin ${color}`} size={size} />
      </div>
    </div>
  );
}
