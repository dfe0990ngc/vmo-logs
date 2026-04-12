import { memo } from "react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { User } from "../users.types";
import { Loader2 } from "lucide-react";

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: () => void;
  isSaving?: boolean;
}

// Delete Make Dialog
const DeleteDialog = memo(({
  open,
  onClose,
  user,
  onConfirm,
  isSaving
}: DeleteDialogProps) => {
  if (!user) {
    return null;
  }

  const fullName = `${user.prefix ? user.prefix + ". " : ""}${
      user.first_name
    }${user.middle_name ? " " + user.middle_name[0] + "." : ""} ${
      user.last_name
    }${user.suffix ? ", " + user.suffix : ""}`;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the user <strong className="text-foreground">{fullName}</strong>.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            Delete User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

export default DeleteDialog;