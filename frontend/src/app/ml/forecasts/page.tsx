'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartWidget } from '@/components/analytics/dashboard/widgets/chart-widget';
import { forecastService, Forecast } from '@/services/forecast.service';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

// Mock site ID for now - in real app this would come from context or selection
const DEMO_SITE_ID = "123e4567-e89b-12d3-a456-426614174000";

export default function ForecastsPage() {
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchForecasts = async () => {
        try {
            setLoading(true);
            // Fetch last 7 days and next 2 days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 2);

            const data = await forecastService.getForecasts(DEMO_SITE_ID, {
                startDate,
                endDate
            });
            setForecasts(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load forecasts. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForecasts();
    }, []);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            await forecastService.generateForecast({
                siteId: DEMO_SITE_ID,
                forecastHorizonHours: 48,
                modelType: 'sarima'
            });
            await fetchForecasts();
        } catch (err) {
            console.error(err);
            // In a real app, show a toast notification here
        } finally {
            setGenerating(false);
        }
    };

    // Format data for chart
    const chartData = forecasts.map(f => ({
        timestamp: new Date(f.forecastTimestamp).toLocaleString(),
        predicted: f.predictedGenerationMw,
        actual: f.actualGenerationMw || null
    }));

    return (
        <AuthGuard>
            <DashboardLayout
                title="Power Generation Forecasts"
                breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'ML', href: '/ml/models' }, { label: 'Forecasts' }]}
                actions={
                    <Button onClick={handleGenerate} disabled={generating}>
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Generate Forecast
                    </Button>
                }
            >
                <div className="space-y-6">
                    <ChartWidget
                        title="Generation Forecast vs Actual (MW)"
                        type="line"
                        data={chartData}
                        xAxisKey="timestamp"
                        series={[
                            { key: "predicted", name: "Predicted Generation", color: "#3b82f6" },
                            { key: "actual", name: "Actual Generation", color: "#10b981" }
                        ]}
                        loading={loading}
                        error={error || undefined}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Forecast Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-4 text-left font-medium">Timestamp</th>
                                            <th className="p-4 text-left font-medium">Model</th>
                                            <th className="p-4 text-right font-medium">Predicted (MW)</th>
                                            <th className="p-4 text-right font-medium">Actual (MW)</th>
                                            <th className="p-4 text-right font-medium">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forecasts.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                                    No forecast data available
                                                </td>
                                            </tr>
                                        ) : (
                                            forecasts.slice(0, 10).map((f) => {
                                                const variance = f.actualGenerationMw
                                                    ? ((f.predictedGenerationMw - f.actualGenerationMw) / f.actualGenerationMw * 100).toFixed(1)
                                                    : '-';

                                                return (
                                                    <tr key={f.id} className="border-b last:border-0">
                                                        <td className="p-4">{new Date(f.forecastTimestamp).toLocaleString()}</td>
                                                        <td className="p-4">{f.modelName}</td>
                                                        <td className="p-4 text-right">{f.predictedGenerationMw.toFixed(2)}</td>
                                                        <td className="p-4 text-right">{f.actualGenerationMw?.toFixed(2) || '-'}</td>
                                                        <td className="p-4 text-right">{variance}%</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
