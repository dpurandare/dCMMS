'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnomaliesPage() {
    return (
        <DashboardLayout
            title="Anomaly Detection"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'ML', href: '/ml/models' }, { label: 'Anomalies' }]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Anomaly Detection</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is under construction. Coming soon!</p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
