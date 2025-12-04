'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForecastsPage() {
    return (
        <DashboardLayout
            title="Power Generation Forecasts"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'ML', href: '/ml/models' }, { label: 'Forecasts' }]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Power Generation Forecasts</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is under construction. Coming soon!</p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
