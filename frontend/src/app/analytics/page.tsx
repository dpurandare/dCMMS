'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { KPICard } from '@/components/analytics/dashboard/widgets/kpi-card';
import { ChartWidget } from '@/components/analytics/dashboard/widgets/chart-widget';
import { analyticsService, KPIResult, KPITrend } from '@/services/analytics.service';
import { AlertTriangle, CheckCircle, Clock, Activity, BarChart2, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
    const [kpis, setKpis] = useState<KPIResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trends, setTrends] = useState<{ [key: string]: KPITrend }>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const kpiData = await analyticsService.getKPIs();
                setKpis(kpiData);

                // Fetch trends for key metrics
                const metrics = ['mttr', 'mtbf', 'completion_rate', 'availability'];
                const trendData: { [key: string]: KPITrend } = {};

                await Promise.all(metrics.map(async (metric) => {
                    try {
                        const trend = await analyticsService.getTrends(metric);
                        trendData[metric] = trend;
                    } catch (e) {
                        console.error(`Failed to fetch trend for ${metric}`, e);
                    }
                }));

                setTrends(trendData);
            } catch (err) {
                setError('Failed to load analytics data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <AuthGuard>
            <DashboardLayout
                title="Analytics Dashboard"
                breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Analytics' }]}
            >
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <KPICard
                            title="Availability"
                            value={kpis?.availability ?? 0}
                            unit="%"
                            icon={<Activity className="h-4 w-4" />}
                            loading={loading}
                            error={error || undefined}
                            trend={{
                                value: 0, // TODO: Calculate actual trend
                                direction: "neutral",
                                label: "vs last 30 days"
                            }}
                        />
                        <KPICard
                            title="MTTR"
                            value={kpis?.mttr ?? 0}
                            unit="h"
                            icon={<Clock className="h-4 w-4" />}
                            loading={loading}
                            error={error || undefined}
                        />
                        <KPICard
                            title="MTBF"
                            value={kpis?.mtbf ?? 0}
                            unit="h"
                            icon={<TrendingUp className="h-4 w-4" />}
                            loading={loading}
                            error={error || undefined}
                        />
                        <KPICard
                            title="Completion Rate"
                            value={kpis?.completionRate ?? 0}
                            unit="%"
                            icon={<CheckCircle className="h-4 w-4" />}
                            loading={loading}
                            error={error || undefined}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <KPICard
                            title="Total Work Orders"
                            value={kpis?.totalWorkOrders ?? 0}
                            icon={<BarChart2 className="h-4 w-4" />}
                            loading={loading}
                            error={error || undefined}
                        />
                        <KPICard
                            title="Critical Alarms"
                            value={kpis?.criticalAlarms ?? 0}
                            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                            loading={loading}
                            error={error || undefined}
                        />
                        <KPICard
                            title="Downtime Hours"
                            value={kpis?.totalDowntimeHours ?? 0}
                            unit="h"
                            icon={<Clock className="h-4 w-4" />}
                            loading={loading}
                            error={error || undefined}
                        />
                        <KPICard
                            title="Maintenance Cost"
                            value={kpis?.totalMaintenanceCost ?? 0}
                            unit="$"
                            icon={<Activity className="h-4 w-4" />}
                            loading={loading}
                            error={error || undefined}
                        />
                    </div>

                    {/* Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <ChartWidget
                            title="Availability Trend (Last 7 Days)"
                            type="area"
                            data={trends['availability']?.trends || []}
                            xAxisKey="date"
                            series={[{ key: "value", name: "Availability %", color: "#10b981" }]}
                            loading={loading}
                            error={error || undefined}
                        />
                        <ChartWidget
                            title="MTTR Trend (Last 7 Days)"
                            type="line"
                            data={trends['mttr']?.trends || []}
                            xAxisKey="date"
                            series={[{ key: "value", name: "MTTR (hours)", color: "#f59e0b" }]}
                            loading={loading}
                            error={error || undefined}
                        />
                        <ChartWidget
                            title="Completion Rate Trend"
                            type="bar"
                            data={trends['completion_rate']?.trends || []}
                            xAxisKey="date"
                            series={[{ key: "value", name: "Completion Rate %", color: "#3b82f6" }]}
                            loading={loading}
                            error={error || undefined}
                        />
                        <ChartWidget
                            title="MTBF Trend"
                            type="line"
                            data={trends['mtbf']?.trends || []}
                            xAxisKey="date"
                            series={[{ key: "value", name: "MTBF (hours)", color: "#8b5cf6" }]}
                            loading={loading}
                            error={error || undefined}
                        />
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
