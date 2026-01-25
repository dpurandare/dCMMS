'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Search, UserCheck, UserX, Trash2, Edit, User as UserIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { format } from 'date-fns';
import { ProtectedButton } from '@/components/auth/protected';
import { usePermissions } from '@/hooks/use-permissions';
import { UserFormDialog } from '@/components/users/user-form-dialog';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { showToast } from '@/lib/toast';

interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt?: string;
}

export default function UsersPage() {
    const router = useRouter();
    const { isAuthenticated, user: currentUser } = useAuthStore();
    const { can } = usePermissions();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login');
            return;
        }
        fetchUsers();
    }, [isAuthenticated, router]);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await api.users.list();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            showToast.error('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (user: User) => {
        if (!can('users.edit')) {
            showToast.error('You do not have permission to edit users');
            return;
        }

        try {
            await api.users.update(user.id, { isActive: !user.isActive });
            showToast.success(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchUsers();
        } catch (error) {
            showToast.error('Failed to update user status');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            await api.users.delete(userId);
            showToast.success('User deleted successfully');
            setDeletingUser(null);
            fetchUsers();
        } catch (error) {
            showToast.error('Failed to delete user');
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin':
            case 'tenant_admin':
            case 'admin':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'site_manager':
            case 'manager':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'technician':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'operator':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'viewer':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Client-side filtering
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && user.isActive) ||
            (statusFilter === 'inactive' && !user.isActive);

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <DashboardLayout
            title="User Management"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Users' }]}
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Users</CardTitle>
                    {can('users.create') && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New User
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="technician">Technician</SelectItem>
                                <SelectItem value="operator">Operator</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Users Table */}
                    {isLoading ? (
                        <div className="flex justify-center p-8">Loading users...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
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
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                                                    {user.role.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {user.lastLoginAt
                                                    ? format(new Date(user.lastLoginAt), 'MMM d, yyyy HH:mm')
                                                    : 'Never'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {can('users.edit') && (
                                                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {can('users.edit') && (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                                                {user.isActive ? (
                                                                    <>
                                                                        <UserX className="mr-2 h-4 w-4" />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck className="mr-2 h-4 w-4" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {currentUser?.id !== user.id && can('users.delete') && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() => setDeletingUser(user)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            <UserFormDialog
                open={isCreateDialogOpen || !!editingUser}
                onClose={() => {
                    setIsCreateDialogOpen(false);
                    setEditingUser(null);
                }}
                user={editingUser}
                onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    setEditingUser(null);
                    fetchUsers();
                }}
            />

            <DeleteUserDialog
                open={!!deletingUser}
                user={deletingUser}
                onClose={() => setDeletingUser(null)}
                onConfirm={() => deletingUser && handleDeleteUser(deletingUser.id)}
            />
        </DashboardLayout>
    );
}
