'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api-client';
import { showToast } from '@/lib/toast';
import { User, UserRole } from '@/types/api';
import { Loader2 } from 'lucide-react';

interface UserFormDialogProps {
    open: boolean;
    onClose: () => void;
    user?: User | null;
    onSuccess: () => void;
}

interface UserFormData {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password?: string;
    role: UserRole;
    isActive: boolean;
    requirePasswordChange?: boolean;
}

export function UserFormDialog({ open, onClose, user, onSuccess }: UserFormDialogProps) {
    const isEditMode = !!user;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<UserFormData>({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        role: 'viewer',
        isActive: true,
        requirePasswordChange: false,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email,
                username: user.username,
                role: user.role,
                isActive: user.isActive,
            });
        } else {
            // Reset form for create mode
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                username: '',
                password: '',
                role: 'viewer',
                isActive: true,
                requirePasswordChange: false,
            });
        }
        setErrors({});
    }, [user, open]);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof UserFormData, string>> = {};

        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.username.trim()) newErrors.username = 'Username is required';

        if (!isEditMode && !formData.password) {
            newErrors.password = 'Password is required';
        } else if (!isEditMode && formData.password && formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            if (isEditMode) {
                // Update existing user
                await api.users.update(user.id, {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    role: formData.role,
                    isActive: formData.isActive,
                    ...(formData.password && { password: formData.password }),
                });
                showToast.success('User updated successfully');
            } else {
                // Create new user
                await api.users.create({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    username: formData.username,
                    password: formData.password!,
                    role: formData.role,
                    isActive: formData.isActive,
                    requirePasswordChange: formData.requirePasswordChange,
                } as any);
                showToast.success('User created successfully');
            }

            onSuccess();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to save user';
            showToast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit User' : 'Create New User'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? 'Update user information and role assignments.'
                            : 'Fill in the details to create a new user account.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* First Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">
                                First Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="John"
                            />
                            {errors.firstName && (
                                <p className="text-sm text-red-500">{errors.firstName}</p>
                            )}
                        </div>

                        {/* Last Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="lastName">
                                Last Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Doe"
                            />
                            {errors.lastName && (
                                <p className="text-sm text-red-500">{errors.lastName}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">
                                Email <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john.doe@example.com"
                                disabled={isEditMode}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500">{errors.email}</p>
                            )}
                        </div>

                        {/* Username */}
                        <div className="grid gap-2">
                            <Label htmlFor="username">
                                Username <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="johndoe"
                                disabled={isEditMode}
                            />
                            {errors.username && (
                                <p className="text-sm text-red-500">{errors.username}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                {isEditMode ? 'New Password (optional)' : 'Password'}{' '}
                                {!isEditMode && <span className="text-red-500">*</span>}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                            />
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password}</p>
                            )}
                            {!isEditMode && (
                                <p className="text-xs text-muted-foreground">
                                    Minimum 8 characters
                                </p>
                            )}
                        </div>

                        {/* Role */}
                        <div className="grid gap-2">
                            <Label htmlFor="role">
                                Role <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="technician">Technician</SelectItem>
                                    <SelectItem value="operator">Operator</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Active Status */}
                        {isEditMode && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isActive: checked as boolean })
                                    }
                                />
                                <Label htmlFor="isActive" className="cursor-pointer">
                                    Account is active
                                </Label>
                            </div>
                        )}

                        {/* Require Password Change */}
                        {!isEditMode && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="requirePasswordChange"
                                    checked={formData.requirePasswordChange}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, requirePasswordChange: checked as boolean })
                                    }
                                />
                                <Label htmlFor="requirePasswordChange" className="cursor-pointer">
                                    Require password change on first login
                                </Label>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Update User' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
