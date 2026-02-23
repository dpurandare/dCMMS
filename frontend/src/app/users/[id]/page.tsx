'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedSection } from '@/components/auth/protected';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import type { User } from '@/types/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Edit, Mail, Phone, Calendar, User as UserIcon, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { CardSkeleton } from '@/components/ui/card-skeleton';

export default function UserDetailsPage({ params }: { params: { id: string } }) {
    return (
        <ProtectedSection permissions={["read:users"]}>
            <UserDetailsContent params={params} />
        </ProtectedSection>
    );
}

function UserDetailsContent({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const fetchUser = async () => {
        try {
            setIsLoading(true);
            const user = await api.users.getById(params.id);
            setUser(user);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            router.push('/users');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout
                title="User Details"
                breadcrumbs={[
                    { label: 'Home', href: '/dashboard' },
                    { label: 'Users', href: '/users' },
                    { label: 'Loading...' },
                ]}
            >
                <CardSkeleton count={1} />
            </DashboardLayout>
        );
    }

    if (!user) return null;

    return (
        <DashboardLayout
            title={`${user.firstName} ${user.lastName}`}
            breadcrumbs={[
                { label: 'Home', href: '/dashboard' },
                { label: 'Users', href: '/users' },
                { label: user.username },
            ]}
        >
            <PageHeader
                title={`${user.firstName} ${user.lastName}`}
                description={user.email}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push('/users')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button onClick={() => router.push(`/users/${user.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Profile
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5" />
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm font-medium text-slate-500">Full Name</div>
                                <div className="mt-1">{user.firstName} {user.lastName}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-500">Username</div>
                                <div className="mt-1">{user.username}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-500">Email</div>
                                <div className="mt-1 flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    {user.email}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-500">Phone</div>
                                <div className="mt-1 flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    {user.phone || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Account & Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm font-medium text-slate-500">Role</div>
                                <div className="mt-1">
                                    <Badge variant="outline" className="capitalize">
                                        {user.role.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-500">Status</div>
                                <div className="mt-1">
                                    {user.isActive ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Active</Badge>
                                    ) : (
                                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Inactive</Badge>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-500">Joined</div>
                                <div className="mt-1 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {format(new Date(user.createdAt), 'PPP')}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-500">Last Login</div>
                                <div className="mt-1">
                                    {user.lastLoginAt
                                        ? format(new Date(user.lastLoginAt), 'PPP p')
                                        : 'Never'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
