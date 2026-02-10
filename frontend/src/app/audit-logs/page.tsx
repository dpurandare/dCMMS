'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import type { AuditLog } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Download, Filter, Search, Shield, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function AuditLogsPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterAction, setFilterAction] = useState<string>('all');
    const [filterEntity, setFilterEntity] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login');
            return;
        }

        if (user?.role !== 'super_admin' && user?.role !== 'tenant_admin') {
            router.push('/dashboard'); // Restrict access
            return;
        }

        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, router, user]);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const params: any = { limit: 100 };
            if (filterAction !== 'all') params.action = filterAction;
            if (filterEntity !== 'all') params.entityType = filterEntity;

            const response = await api.auditLogs.list(params);
            setLogs(response.data || []);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await api.auditLogs.export();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export logs:', error);
            alert('Failed to export logs');
        }
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('delete')) return 'destructive';
        if (action.includes('create')) return 'default'; // primary/green usually
        if (action.includes('update')) return 'secondary';
        return 'outline';
    };

    const filteredLogs = logs.filter(log =>
        searchTerm === '' ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.includes(searchTerm)
    );

    return (
        <DashboardLayout
            title="Audit Logs"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Audit Logs' }]}
        >
            <PageHeader
                title="Audit Logs"
                description="View tamper-proof system activity logs."
                actions={
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                }
            />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            System Activity
                        </CardTitle>
                        <div className="flex gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search logs..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={fetchLogs}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <Select value={filterAction} onValueChange={(val) => { setFilterAction(val); fetchLogs(); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="user_login">Login</SelectItem>
                                <SelectItem value="create_user">Create User</SelectItem>
                                <SelectItem value="update_user">Update User</SelectItem>
                                <SelectItem value="delete_user">Delete User</SelectItem>
                                {/* Add more as we discover them */}
                            </SelectContent>
                        </Select>

                        <Select value={filterEntity} onValueChange={(val) => { setFilterEntity(val); fetchLogs(); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Entity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Entities</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="work_order">Work Order</SelectItem>
                                <SelectItem value="asset">Asset</SelectItem>
                                <SelectItem value="compliance_report">Compliance Report</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">Loading logs...</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Entity Type</TableHead>
                                        <TableHead>Entity ID</TableHead>
                                        <TableHead>Changes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap text-xs text-slate-500">
                                                {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{log.userId.substring(0, 8)}...</TableCell>
                                            <TableCell>
                                                <Badge variant={getActionBadgeColor(log.action) as any}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{log.entityType}</TableCell>
                                            <TableCell className="font-mono text-xs">{log.entityId.substring(0, 8)}...</TableCell>
                                            <TableCell className="max-w-xs truncate text-xs text-slate-500">
                                                {log.changes ? JSON.stringify(log.changes) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                No audit logs found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
