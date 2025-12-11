'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mlInferenceService, Prediction } from '@/services/ml-inference.service';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';

export default function AnomaliesPage() {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await mlInferenceService.getPredictions();
                // Filter for anomalies only
                const anomalies = data.filter(p => p.anomalies && p.anomalies.some(a => a.isAnomaly));
                setPredictions(anomalies);
            } catch (err) {
                console.error('Failed to fetch anomalies', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout
                title="Anomaly Detection"
                breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'ML' }, { label: 'Anomalies' }]}
            >
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{predictions.length}</div>
                                <p className="text-xs text-muted-foreground">Detected in real-time</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                                <Activity className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {predictions.filter(p => p.anomalies.some(a => a.severity === 'critical')).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monitored Assets</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">--</div>
                                <p className="text-xs text-muted-foreground">Total assets being monitored</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Detected Anomalies</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-4 text-left font-medium">Asset ID</th>
                                            <th className="p-4 text-left font-medium">Timestamp</th>
                                            <th className="p-4 text-left font-medium">Severity</th>
                                            <th className="p-4 text-left font-medium">Description</th>
                                            <th className="p-4 text-right font-medium">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center">Loading...</td>
                                            </tr>
                                        ) : predictions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                                    No anomalies detected
                                                </td>
                                            </tr>
                                        ) : (
                                            predictions.map((p, i) => {
                                                const anomaly = p.anomalies.find(a => a.isAnomaly);
                                                if (!anomaly) return null;

                                                return (
                                                    <tr key={`${p.assetId}-${i}`} className="border-b last:border-0 hover:bg-muted/50">
                                                        <td className="p-4 font-mono text-xs">{p.assetId}</td>
                                                        <td className="p-4">{new Date(p.timestamp).toLocaleString()}</td>
                                                        <td className="p-4">
                                                            <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                                                                {anomaly.severity.toUpperCase()}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-4">{anomaly.description}</td>
                                                        <td className="p-4 text-right font-mono">
                                                            {(anomaly.score * 100).toFixed(1)}%
                                                        </td>
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
