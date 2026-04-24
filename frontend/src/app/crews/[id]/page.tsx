'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import type { Crew, User } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserPlus, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedSection } from '@/components/auth/protected';
import { usePermissions } from '@/hooks/use-permissions';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/common';
import Link from 'next/link';

export default function CrewDetailsPage({ params }: { params: { id: string } }) {
    return (
        <ProtectedSection permissions={["read:users"]}>
            <CrewDetailsContent crewId={params.id} />
        </ProtectedSection>
    );
}

function CrewDetailsContent({ crewId }: { crewId: string }) {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { can } = usePermissions();

    const [crew, setCrew] = useState<Crew | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchData();
    }, [isAuthenticated, crewId]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [crewData, usersData] = await Promise.all([
                api.crews.getById(crewId),
                api.users.list({ limit: 100 }) // Adjust limit as needed
            ]);
            setCrew(crewData);
            setAllUsers(usersData.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            showToast.error('Failed to load crew data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!can('update:users')) return;
        
        // Simple built-in prompt for MVP, better would be a Select component Dialog
        const userEmailOrName = prompt('Enter the exact email or username of the user to add:');
        if (!userEmailOrName) return;

        const user = allUsers.find(u => 
            u.email.toLowerCase() === userEmailOrName.toLowerCase() || 
            u.username.toLowerCase() === userEmailOrName.toLowerCase()
        );

        if (!user) {
            showToast.error('User not found in tenant');
            return;
        }

        try {
            await api.crews.addMember(crewId, user.id, false);
            showToast.success('Member added');
            fetchData();
        } catch (error: any) {
            showToast.error(error?.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Remove member from crew?')) return;
        try {
            await api.crews.removeMember(crewId, userId);
            showToast.success('Member removed');
            fetchData();
        } catch (error) {
            showToast.error('Failed to remove member');
        }
    };

    const handleSetLeader = async (userId: string, isLeader: boolean) => {
        try {
            await api.crews.setMemberRole(crewId, userId, isLeader);
            showToast.success(`Role updated`);
            fetchData();
        } catch (error) {
            showToast.error('Failed to update role');
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Loading..." breadcrumbs={[]}>
                <TableSkeleton rows={3} columns={3} />
            </DashboardLayout>
        );
    }

    if (!crew) {
        return (
            <DashboardLayout title="Not Found" breadcrumbs={[]}>
                <div className="p-8 text-center text-slate-500">Crew not found</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title={crew.name}
            breadcrumbs={[
                { label: 'Home', href: '/dashboard' },
                { label: 'Crews', href: '/crews' },
                { label: crew.name }
            ]}
        >
            <div className="mb-6 flex items-center justify-between">
                <Button variant="outline" asChild>
                    <Link href="/crews">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Crews
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Crew Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm font-medium text-slate-500">Name</div>
                            <div className="text-lg font-semibold">{crew.name}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-500">Status</div>
                            <Badge variant={crew.isActive ? 'default' : 'secondary'} className="mt-1">
                                {crew.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-500">Description</div>
                            <div className="text-sm mt-1">{crew.description || 'N/A'}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Members</CardTitle>
                            <CardDescription>Manage users assigned to this team</CardDescription>
                        </div>
                        {can('update:users') && (
                            <Button onClick={handleAddMember} size="sm">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Member
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {crew.members?.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 border rounded-lg bg-slate-50">
                                This crew has no members yet.
                            </div>
                        ) : (
                            <div className="space-y-4 pt-4">
                                {crew.members?.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                                                <UserIcon className="h-5 w-5 text-slate-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {member.user?.firstName} {member.user?.lastName}
                                                    {member.isLeader && (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 leading-none py-0 align-middle">
                                                            <Shield className="h-3 w-3 mr-1 inline" /> Leader
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">{member.user?.email} • {member.user?.role.replace('_', ' ')}</div>
                                            </div>
                                        </div>
                                        
                                        {can('update:users') && (
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleSetLeader(member.userId, !member.isLeader)}
                                                    title={member.isLeader ? "Remove Leader Role" : "Make Leader"}
                                                >
                                                    <Shield className={`h-4 w-4 ${member.isLeader ? "text-amber-500" : "text-slate-300"}`} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemoveMember(member.userId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
