'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
    return (
        <DashboardLayout
            title="System Settings"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Settings' }]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600">This page is under construction. Coming soon!</p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
