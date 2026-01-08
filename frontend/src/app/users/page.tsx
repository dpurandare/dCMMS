'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuditLogger, AuditActions, AuditResources } from '@/lib/audit-logger';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, User as UserIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

export default function UsersPage() {
    return (
        <PermissionGuard permission="users.view" showAccessDenied>
            <UsersContent />
        </PermissionGuard>
    );
}

function UsersContent() {
    const router = useRouter();
    const { isAuthenticated, user: currentUser } = useAuthStore();
    const { hasPermission } = usePermissions();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [totalPages, setTotalPages] = useState(1);


    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login');
        } else {
            fetchUsers();
        }
    }, [isAuthenticated, router, currentPage]); // Re-fetch when page changes

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/users', {
                params: {
                    page: currentPage,
                    limit: itemsPerPage,
                },
            });

            // Server returns { data, pagination }
            if (response.data.data && response.data.pagination) {
                setUsers(response.data.data);
                setTotalPages(response.data.pagination.totalPages);
            } else {
                // Fallback for backward compatibility
                setUsers(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const userToDelete = users.find(u => u.id === deleteId);
            await api.delete(`/users/${deleteId}`);

            // Audit log
            AuditLogger.log(
                AuditActions.DELETE,
                AuditResources.USER,
                deleteId,
                { username: userToDelete?.username, email: userToDelete?.email }
            );

            setDeleteId(null);
            fetchUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Failed to delete user');
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin':
            case 'tenant_admin':
                return 'destructive'; // Red
            case 'site_manager':
                return 'default'; // Black/Primary
            case 'technician':
                return 'secondary'; // Gray
            default:
                return 'outline';
        }
    };

    return (
        <DashboardLayout
            title="User Management"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Users' }]}
        >
            <PageHeader
                title="Users"
                description="Manage system users, roles, and permissions."
                actions={
                    hasPermission('users.create') ? (
                        <Button onClick={() => router.push('/users/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    ) : null
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">Loading users...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                                    <UserIcon className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeColor(user.role) as any}>
                                                {user.role.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.isActive ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {currentUser?.id !== user.id && hasPermission('users.delete') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => setDeleteId(user.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {!isLoading && totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete User"
                description="Are you sure you want to delete this user? This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={handleDelete}
            />
        </DashboardLayout>
    );
}
