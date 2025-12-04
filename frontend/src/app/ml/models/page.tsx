'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ModelRegistryPage() {
    return (
        <DashboardLayout
            title="Model Registry"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'ML', href: '/ml/models' }, { label: 'Models' }]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Model Registry</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is under construction. Coming soon!</p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
