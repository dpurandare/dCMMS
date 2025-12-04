'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocsPage() {
    return (
        <DashboardLayout
            title="Documentation"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Documentation' }]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is under construction. Coming soon!</p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
