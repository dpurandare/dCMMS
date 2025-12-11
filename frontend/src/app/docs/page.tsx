'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, FileText, Code, ExternalLink } from 'lucide-react';

export default function DocsPage() {
    const docs = [
        {
            title: 'User Guide',
            description: 'Learn how to use the dCMMS application for daily operations.',
            icon: <Book className="h-6 w-6 text-blue-500" />,
            link: '/docs/user-guide'
        },
        {
            title: 'API Reference',
            description: 'Detailed documentation for the dCMMS API endpoints.',
            icon: <Code className="h-6 w-6 text-green-500" />,
            link: '/docs/api'
        },
        {
            title: 'Admin Guide',
            description: 'Configuration and management guide for administrators.',
            icon: <FileText className="h-6 w-6 text-purple-500" />,
            link: '/docs/admin'
        }
    ];

    return (
        <AuthGuard>
            <DashboardLayout
                title="Documentation"
                breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Documentation' }]}
            >
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {docs.map((doc, index) => (
                        <Card key={index} className="flex flex-col">
                            <CardHeader>
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                                    {doc.icon}
                                </div>
                                <CardTitle>{doc.title}</CardTitle>
                                <CardDescription>{doc.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Button variant="outline" className="w-full justify-between" asChild>
                                    <a href={doc.link}>
                                        Read Documentation
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
