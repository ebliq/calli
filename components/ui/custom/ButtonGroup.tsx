// ButtonGroup.tsx
import React from "react";

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`inline-flex rounded-md shadow-sm ${className || ""}`}
      role="group"
      {...props}
    >
      {children}
    </div>
  )
);

ButtonGroup.displayName = "ButtonGroup";

export default ButtonGroup;
