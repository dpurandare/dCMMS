'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HelpPage() {
    return (
        <DashboardLayout
            title="Help & Support"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Help' }]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Help & Support</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is under construction. Coming soon!</p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
