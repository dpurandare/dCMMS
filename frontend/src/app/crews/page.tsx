'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import type { Crew } from '@/types/api';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Search, CheckCircle2, XCircle, Trash2, Edit, Users as UsersIcon, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { format } from 'date-fns';
import { ProtectedSection } from '@/components/auth/protected';
import { usePermissions } from '@/hooks/use-permissions';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/common';
import Link from 'next/link';

export default function CrewsPage() {
    return (
        <ProtectedSection permissions={["read:users"]}>
            <CrewsPageContent />
        </ProtectedSection>
    );
}

function CrewsPageContent() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { can } = usePermissions();

    const [crews, setCrews] = useState<Crew[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login');
            return;
        }
        fetchCrews();
    }, [isAuthenticated, router]);

    const fetchCrews = async () => {
        try {
            setIsLoading(true);
            const data = await api.crews.list();
            setCrews(data.data || []);
        } catch (error) {
            console.error('Failed to fetch crews:', error);
            showToast.error('Failed to load crews');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (crew: Crew) => {
        if (!can('update:users')) {
            showToast.error('You do not have permission to edit crews');
            return;
        }

        try {
            await api.crews.update(crew.id, { isActive: !crew.isActive });
            showToast.success(`Crew ${!crew.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchCrews();
        } catch (error) {
            showToast.error('Failed to update crew status');
        }
    };

    const handleDeleteCrew = async (crewId: string) => {
        if (!confirm('Are you sure you want to delete this crew?')) return;
        
        try {
            await api.crews.delete(crewId);
            showToast.success('Crew deleted successfully');
            fetchCrews();
        } catch (error) {
            showToast.error('Failed to delete crew');
        }
    };

    const filteredCrews = crews.filter(crew => {
        return crew.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            crew.description?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <DashboardLayout
            title="Crew Management"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Crews' }]}
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Crews & Teams</CardTitle>
                    {can('create:users') && (
                        <Button onClick={() => {
                            const name = prompt('Enter a name for the new Crew:');
                            if (name) {
                                api.crews.create({ name }).then(() => {
                                    showToast.success('Crew created');
                                    fetchCrews();
                                }).catch(() => showToast.error('Failed to create crew'));
                            }
                        }}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Crew
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search crews by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <TableSkeleton rows={5} columns={5} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Crew Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Members</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCrews.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            No crews found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCrews.map((crew) => (
                                        <TableRow key={crew.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                                        <UsersIcon className="h-4 w-4 text-slate-500" />
                                                    </div>
                                                    <div className="font-medium">
                                                        <Link href={`/crews/${crew.id}`} className="hover:underline text-blue-600">
                                                            {crew.name}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500 max-w-sm truncate">
                                                {crew.description || 'No description'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">
                                                    {crew.members?.length || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={crew.isActive ? 'default' : 'secondary'}>
                                                    {crew.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/crews/${crew.id}`}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View / Manage
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {can('update:users') && (
                                                            <DropdownMenuItem onClick={() => {
                                                                const desc = prompt('Update description for ' + crew.name + ':', crew.description || '');
                                                                if (desc !== null) {
                                                                    api.crews.update(crew.id, { description: desc }).then(() => {
                                                                        showToast.success('Description updated');
                                                                        fetchCrews();
                                                                    });
                                                                }
                                                            }}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit Desc
                                                            </DropdownMenuItem>
                                                        )}
                                                        {can('update:users') && (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(crew)}>
                                                                {crew.isActive ? (
                                                                    <>
                                                                        <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {can('delete:users') && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() => handleDeleteCrew(crew.id)}
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
        </DashboardLayout>
    );
}
