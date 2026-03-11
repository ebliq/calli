import React from "react";
import { Button } from "../ui/button";
import * as Icon from "lucide-react";

export interface AiButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AiButton = React.forwardRef<
  HTMLButtonElement,
  Omit<AiButtonProps, "icon">
>(({ children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      {...props}
      className={`px-2 py-2 bg-gray-800 text-white hover:bg-gray-700 bg-gradient-to-r from-primary-600 to-secondary text-white font-bold py-2 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center ${props.className}`}
    >
      <Icon.Brain />
      {children}
    </Button>
  );
});

AiButton.displayName = "AiButton";

export { AiButton };
