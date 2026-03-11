import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";

import React from "react";

interface DeleteButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  key?: string;
}

const DeleteButton = React.forwardRef<HTMLDivElement, DeleteButtonProps>(
  ({ className, children, key }, ref) => (
    <Button key={key} variant="ghost" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
      <Trash2 className="h-4 w-4" />
    </Button>
  )
);

DeleteButton.displayName = "DeleteButton";

export default DeleteButton;
