'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
    return (
        <DashboardLayout
            title="Reports Center"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Reports' }]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Reports Center</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is under construction. Coming soon!</p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
