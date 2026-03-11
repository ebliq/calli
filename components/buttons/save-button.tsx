import { Save } from "lucide-react";
import { Button } from "../ui/button";
interface SaveButtonProps {
  className?: string;
  onlyIcon?: boolean;
  key?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export default function SaveButton({
  onlyIcon = true,
  key,
  onClick,
  className,
}: SaveButtonProps) {
  return (
    <Button
      className={className}
      key={key}
      variant="secondary"
      size="sm"
      onClick={onClick}
    >
      <Save className="h-4 w-4" />
      {onlyIcon && "Speichern"}
    </Button>
  );
}
