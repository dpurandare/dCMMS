'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageCircle, Phone } from 'lucide-react';

export default function HelpPage() {
    return (
        <AuthGuard>
            <DashboardLayout
                title="Help & Support"
                breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Help' }]}
            >
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Support</CardTitle>
                            <CardDescription>Send us a message and we&apos;ll get back to you as soon as possible.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" placeholder="How can we help?" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" placeholder="Describe your issue..." className="min-h-[150px]" />
                            </div>
                            <Button className="w-full">Send Message</Button>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Other Ways to Reach Us</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Email Support</p>
                                        <p className="text-sm text-muted-foreground">support@dcmms.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Phone Support</p>
                                        <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                        <MessageCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Live Chat</p>
                                        <p className="text-sm text-muted-foreground">Available Mon-Fri, 9am-5pm EST</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>FAQs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                                    <li>How do I reset my password?</li>
                                    <li>Where can I find API documentation?</li>
                                    <li>How do I add a new user?</li>
                                    <li>Can I export reports to PDF?</li>
                                </ul>
                                <Button variant="link" className="mt-4 px-0">View all FAQs</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
