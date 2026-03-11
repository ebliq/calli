import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "components/ui/alert-dialog";
import { Button, buttonVariants } from "components/ui/button";
import { Trash2 } from "lucide-react";

// h-10 flex items-center justify-center rounded-l-none border-l-0
interface AlertDialogDeleteProps {
  buttonText?: boolean;
  buttonClass?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const AlertDialogDelete: React.FC<AlertDialogDeleteProps> = ({
  onClick,
  buttonClass,
  buttonText,
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bist du dir absolut sicher?</AlertDialogTitle>
          <AlertDialogDescription>
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onClick}>
            <Trash2 className="h-4 w-4" />
            Bestätigen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AlertDialogDelete;

interface AlertDialogDeleteExternalStateProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteClick: () => void;
}

const AlertDialogDeleteExternalState: React.FC<
  AlertDialogDeleteExternalStateProps
> = ({ open, onOpenChange, onDeleteClick }) => {
  function executeDelete(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    onOpenChange(false);
    onDeleteClick();
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bist du dir absolut sicher?</AlertDialogTitle>
          <AlertDialogDescription>
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction onClick={executeDelete}>
            <Trash2 className="h-4 w-4" />
            Bestätigen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { AlertDialogDeleteExternalState };
