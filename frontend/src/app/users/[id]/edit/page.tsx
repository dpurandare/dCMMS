'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuditLogger, AuditActions, AuditResources } from '@/lib/audit-logger';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api-client';
import { ArrowLeft } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/card-skeleton';

const userSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    role: z.enum([
        'super_admin',
        'tenant_admin',
        'site_manager',
        'technician',
        'operator',
        'viewer',
    ]),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function EditUserPage({ params }: { params: { id: string } }) {
    return (
        <PermissionGuard permission="users.edit" showAccessDenied>
            <EditUserContent params={params} />
        </PermissionGuard>
    );
}

function EditUserContent({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            phone: '',
            role: 'viewer',
        },
    });

    useEffect(() => {
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const fetchUser = async () => {
        try {
            setIsLoading(true);
            const user = await api.users.getById(params.id);
            form.reset({
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
            });
        } catch (error) {
            console.error('Failed to fetch user:', error);
            router.push('/users');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: UserFormValues) => {
        try {
            setIsSubmitting(true);
            await api.users.update(params.id, {
                firstName: data.firstName,
                lastName: data.lastName,
                username: data.username,
                email: data.email,
                phone: data.phone,
            });

            // Audit log
            AuditLogger.log(
                AuditActions.UPDATE,
                AuditResources.USER,
                params.id,
                { username: data.username, email: data.email }
            );

            router.push('/users');
        } catch (error) {
            console.error('Failed to update user:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout
                title="Edit User"
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

    return (
        <DashboardLayout
            title="Edit User"
            breadcrumbs={[
                { label: 'Home', href: '/dashboard' },
                { label: 'Users', href: '/users' },
                { label: 'Edit User' },
            ]}
        >
            <PageHeader
                title="Edit User Profile"
                description="Update user information."
                actions={
                    <Button variant="outline" onClick={() => router.push('/users')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                }
            />

            <Card className="max-w-2xl">
                <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input placeholder="johndoe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="john@example.com" type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role (Read Only)</FormLabel>
                                            <Select disabled onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a role" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="viewer">Viewer</SelectItem>
                                                    <SelectItem value="operator">Operator</SelectItem>
                                                    <SelectItem value="technician">Technician</SelectItem>
                                                    <SelectItem value="site_manager">Site Manager</SelectItem>
                                                    <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Role cannot be changed here.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+1234567890" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button variant="outline" type="button" onClick={() => router.push('/users')}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
