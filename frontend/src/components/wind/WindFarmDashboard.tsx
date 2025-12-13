import React, { useState } from 'react';
import { TurbineHealthHeatmap, TurbineHealth } from './TurbineHealthHeatmap';
import { WindPowerCorrelation, PowerCorrelationPoint } from './WindPowerCorrelation';
import { AdvancedForecastDashboard } from './AdvancedForecastDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Wind, Zap, AlertTriangle } from 'lucide-react';

interface WindFarmDashboardProps {
    turbines: TurbineHealth[];
    correlationData: PowerCorrelationPoint[];
    theoreticalCurve: { windSpeed: number; powerOutput: number }[];
}

export function WindFarmDashboard({ turbines, correlationData, theoreticalCurve }: WindFarmDashboardProps) {
    const [selectedTurbineId, setSelectedTurbineId] = useState<string | null>(null);

    const totalPower = turbines.reduce((sum, t) => sum + t.powerOutputKw, 0);
    const avgWindSpeed = turbines.reduce((sum, t) => sum + t.windSpeedMs, 0) / turbines.length;
    const activeTurbines = turbines.filter(t => t.status === 'operational').length;
    const availability = (activeTurbines / turbines.length) * 100;

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Generation</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(totalPower / 1000).toFixed(2)} MW</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last hour</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Wind Speed</CardTitle>
                        <Wind className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgWindSpeed.toFixed(1)} m/s</div>
                        <p className="text-xs text-muted-foreground">Optimal range</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Availability</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{availability.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">{activeTurbines}/{turbines.length} Turbines Online</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{turbines.filter(t => t.status === 'critical' || t.status === 'warning').length}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
                    <TabsTrigger value="forecasting">Forecasting 2.0 🚀</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <TurbineHealthHeatmap
                            turbines={turbines}
                            onTurbineClick={setSelectedTurbineId}
                        />
                        <WindPowerCorrelation
                            data={correlationData}
                            theoreticalCurve={theoreticalCurve}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="performance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Performance Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Performance charts and detailed analytics would go here.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="forecasting">
                    <AdvancedForecastDashboard siteId="mock-site-id" />
                </TabsContent>
            </Tabs>
        </div >
    );
}
