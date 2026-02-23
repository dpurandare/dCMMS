"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedSection } from "@/components/auth/protected";
import { DashboardGrid } from "@/components/analytics/dashboard/dashboard-grid";
import { dashboardService } from "@/services/dashboard.service";
import { Dashboard } from "@/types/dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function AnalyticsDashboardPage() {
    return (
        <ProtectedSection permissions={["read:analytics"]}>
            <DashboardContent />
        </ProtectedSection>
    );
}

function DashboardContent() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
    const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDashboards();
    }, []);

    useEffect(() => {
        if (selectedDashboardId) {
            loadDashboardData(selectedDashboardId);
        }
    }, [selectedDashboardId]);

    const loadDashboards = async () => {
        try {
            const list = await dashboardService.list();
            setDashboards(list);
            if (list.length > 0) {
                // Select default or first dashboard
                const defaultDashboard = list.find((d) => d.isDefault);
                setSelectedDashboardId(defaultDashboard ? defaultDashboard.id : list[0].id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Failed to load dashboards", error);
            setLoading(false);
        }
    };

    const loadDashboardData = async (id: string) => {
        setRefreshing(true);
        try {
            const dashboard = await dashboardService.render(id);
            setCurrentDashboard(dashboard);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        if (selectedDashboardId) {
            loadDashboardData(selectedDashboardId);
        }
    };

    if (loading && !currentDashboard) {
        return (
            <DashboardLayout title="Analytics Dashboard">
                <div className="flex h-full items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Analytics Dashboard">
            <div className="flex flex-col space-y-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
                        <p className="text-muted-foreground">
                            Monitor key performance indicators and operational metrics.
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Select
                            value={selectedDashboardId || ""}
                            onValueChange={setSelectedDashboardId}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select dashboard" />
                            </SelectTrigger>
                            <SelectContent>
                                {dashboards.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                        {d.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {currentDashboard ? (
                    <DashboardGrid widgets={currentDashboard.widgets} loading={refreshing && !currentDashboard} />
                ) : (
                    <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
                        <div className="text-center">
                            <h3 className="text-lg font-medium">No Dashboard Selected</h3>
                            <p className="text-sm text-muted-foreground">
                                Select a dashboard from the dropdown or create a new one.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
