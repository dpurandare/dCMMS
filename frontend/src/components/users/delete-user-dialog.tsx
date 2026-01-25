'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User } from '@/types/api';

interface DeleteUserDialogProps {
    open: boolean;
    user: User | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteUserDialog({ open, user, onClose, onConfirm }: DeleteUserDialogProps) {
    if (!user) return null;

    const userName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username;

    return (
        <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>{userName}</strong> ({user.email})?
                        <br />
                        <br />
                        This action cannot be undone. All data associated with this user will be permanently removed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Delete User
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
