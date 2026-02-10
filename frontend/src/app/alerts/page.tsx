'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth-store';
import { alertsService, Alert, AlertStats } from '@/services/alerts.service';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ProtectedSection } from '@/components/auth/protected';
import { usePermissions } from '@/hooks/use-permissions';

export default function AlertsPage() {
    return (
        <ProtectedSection permissions={['read:alerts']}>
            <AlertsContent />
        </ProtectedSection>
    );
}

function AlertsContent() {
    const { user } = useAuthStore();
    const { can } = usePermissions();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [stats, setStats] = useState<AlertStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [comment, setComment] = useState('');
    const [resolution, setResolution] = useState('');
    const [actionType, setActionType] = useState<'acknowledge' | 'resolve' | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user?.tenantId) return;

        try {
            setLoading(true);
            const [alertsData, statsData] = await Promise.all([
                alertsService.getAlerts({ tenantId: user.tenantId, limit: 50 }),
                alertsService.getAlertStats({ tenantId: user.tenantId }),
            ]);

            setAlerts(alertsData.alerts);
            setStats(statsData.stats);
        } catch (error) {
            console.error('Failed to fetch alerts data:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.tenantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async () => {
        if (!selectedAlert || !user?.id) return;

        try {
            if (actionType === 'acknowledge') {
                await alertsService.acknowledgeAlert(selectedAlert.id, user.id, comment);
            } else if (actionType === 'resolve') {
                await alertsService.resolveAlert(selectedAlert.id, user.id, resolution, comment);
            }

            setIsDialogOpen(false);
            setComment('');
            setResolution('');
            fetchData(); // Refresh data
        } catch (error) {
            console.error(`Failed to ${actionType} alert:`, error);
        }
    };

    const openActionDialog = (alert: Alert, type: 'acknowledge' | 'resolve') => {
        setSelectedAlert(alert);
        setActionType(type);
        setIsDialogOpen(true);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-red-50 text-red-700';
            case 'acknowledged': return 'bg-yellow-50 text-yellow-700';
            case 'resolved': return 'bg-green-50 text-green-700';
            case 'suppressed': return 'bg-slate-50 text-slate-700';
            default: return 'bg-slate-50 text-slate-700';
        }
    };

    return (
        <DashboardLayout
            title="System Alerts"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Alerts' }]}
        >
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Active</CardTitle>
                        <Bell className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.active || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.bySeverity.critical || 0} Critical, {stats?.bySeverity.high || 0} High
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.acknowledged || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg. Response: {stats?.averageResponseTime || 0} min
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.resolved || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg. Resolution: {stats?.averageResolutionTime || 0} min
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Suppressed</CardTitle>
                        <Info className="h-4 w-4 text-slate-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.suppressed || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Maintenance mode or muted
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Alerts</CardTitle>
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Severity</TableHead>
                                <TableHead>Alert</TableHead>
                                <TableHead>Asset / Site</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Loading alerts...
                                    </TableCell>
                                </TableRow>
                            ) : alerts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No alerts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                alerts.map((alert) => (
                                    <TableRow key={alert.id}>
                                        <TableCell>
                                            <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                                                {alert.severity.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{alert.title}</div>
                                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                                                {alert.description}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{alert.asset?.name || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{alert.site?.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={getStatusColor(alert.status)}>
                                                {alert.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(alert.triggeredAt), 'MMM d, HH:mm')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {alert.status === 'active' && can('acknowledge:alerts') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openActionDialog(alert, 'acknowledge')}
                                                >
                                                    Acknowledge
                                                </Button>
                                            )}
                                            {alert.status === 'acknowledged' && can('resolve:alerts') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openActionDialog(alert, 'resolve')}
                                                >
                                                    Resolve
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Action Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'acknowledge' ? 'Acknowledge Alert' : 'Resolve Alert'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedAlert?.title}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {actionType === 'resolve' && (
                            <div className="grid gap-2">
                                <Label htmlFor="resolution">Resolution Action</Label>
                                <Textarea
                                    id="resolution"
                                    placeholder="What was done to fix the issue?"
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="comment">Comments (Optional)</Label>
                            <Textarea
                                id="comment"
                                placeholder="Add any additional notes..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAction}>
                            {actionType === 'acknowledge' ? 'Acknowledge' : 'Resolve'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
