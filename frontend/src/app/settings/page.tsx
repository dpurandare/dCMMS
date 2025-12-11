'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/auth-store';
import { User, Bell, Moon, Sun, Shield, Loader2 } from 'lucide-react';
import { userService } from '@/services/user.service';
import { notificationService } from '@/services/notification.service';
import { UserProfile } from '@/types/user';
import { NotificationPreference } from '@/types/notification';

export default function SettingsPage() {
    const { user: authUser } = useAuthStore();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Profile Form State
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        phone: ''
    });

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [userProfile, userPreferences] = await Promise.all([
                userService.getProfile(),
                authUser ? notificationService.getPreferences(authUser.id) : Promise.resolve({ preferences: [] })
            ]);

            setProfile(userProfile);
            setProfileForm({
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                email: userProfile.email,
                username: userProfile.username,
                phone: userProfile.phone || ''
            });

            // Initialize preferences with defaults if empty or map existing
            // For simplicity, we'll just use what the backend returns
            setPreferences(userPreferences.preferences || []);

        } catch (error) {
            console.error("Failed to load settings data", error);
            alert("Failed to load settings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        if (!profile) return;
        try {
            setIsSaving(true);
            const updated = await userService.updateProfile(profile.id, {
                firstName: profileForm.firstName,
                lastName: profileForm.lastName,
                phone: profileForm.phone
            });
            setProfile(updated);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!profile) return;
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert("New passwords do not match.");
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            alert("Password must be at least 8 characters.");
            return;
        }

        try {
            setIsSaving(true);
            await userService.changePassword(profile.id, passwordForm.currentPassword, passwordForm.newPassword);
            alert("Password changed successfully!");
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error("Failed to change password", error);
            alert(error.response?.data?.message || "Failed to change password.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePreferenceToggle = async (eventType: string, channel: string, checked: boolean) => {
        if (!profile) return;

        // Optimistic update
        const updatedPreferences = [...preferences];
        const existingIndex = updatedPreferences.findIndex(p => p.eventType === eventType && p.channel === channel);

        if (existingIndex >= 0) {
            updatedPreferences[existingIndex] = { ...updatedPreferences[existingIndex], isEnabled: checked };
        } else {
            updatedPreferences.push({
                userId: profile.id,
                eventType,
                channel,
                isEnabled: checked
            });
        }

        setPreferences(updatedPreferences);

        try {
            await notificationService.updatePreferences(profile.id, updatedPreferences);
        } catch (error) {
            console.error("Failed to update preferences", error);
            // Revert on failure (could be improved)
            alert("Failed to save preference.");
            loadData(); // Reload to sync
        }
    };

    const getPreference = (eventType: string, channel: string) => {
        return preferences.find(p => p.eventType === eventType && p.channel === channel)?.isEnabled ?? false;
    };

    if (isLoading) {
        return (
            <DashboardLayout title="System Settings">
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <AuthGuard>
            <DashboardLayout
                title="System Settings"
                breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Settings' }]}
            >
                <div className="max-w-4xl mx-auto">
                    <Tabs defaultValue="profile" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="notifications">Notifications</TabsTrigger>
                            <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Profile Information</CardTitle>
                                    <CardDescription>Update your personal information.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input
                                                id="firstName"
                                                value={profileForm.firstName}
                                                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                value={profileForm.lastName}
                                                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input id="username" value={profileForm.username} disabled className="bg-slate-100" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" value={profileForm.email} disabled className="bg-slate-100" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                    <Button onClick={handleProfileUpdate} disabled={isSaving}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Security</CardTitle>
                                    <CardDescription>Manage your password.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="currentPassword">Current Password</Label>
                                        <Input
                                            id="currentPassword"
                                            type="password"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                    <Button variant="outline" onClick={handlePasswordChange} disabled={isSaving}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Change Password
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notifications" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Notification Preferences</CardTitle>
                                    <CardDescription>Choose what you want to be notified about.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Work Orders</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <Label>Work Order Assigned</Label>
                                                <p className="text-sm text-muted-foreground">When a work order is assigned to you.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Email</span>
                                                    <Switch
                                                        checked={getPreference('work_order_assigned', 'email')}
                                                        onChange={(e) => handlePreferenceToggle('work_order_assigned', 'email', e.target.checked)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Push</span>
                                                    <Switch
                                                        checked={getPreference('work_order_assigned', 'push')}
                                                        onChange={(e) => handlePreferenceToggle('work_order_assigned', 'push', e.target.checked)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Alerts</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <Label>Critical Alerts</Label>
                                                <p className="text-sm text-muted-foreground">When a critical system alert is triggered.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Email</span>
                                                    <Switch
                                                        checked={getPreference('alert_critical', 'email')}
                                                        onChange={(e) => handlePreferenceToggle('alert_critical', 'email', e.target.checked)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Push</span>
                                                    <Switch
                                                        checked={getPreference('alert_critical', 'push')}
                                                        onChange={(e) => handlePreferenceToggle('alert_critical', 'push', e.target.checked)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="appearance" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Appearance</CardTitle>
                                    <CardDescription>Customize the look and feel of the application.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Theme</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div
                                                className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'light' ? 'border-primary' : 'border-muted'}`}
                                                onClick={() => setTheme('light')}
                                            >
                                                <Sun className="mb-2 h-6 w-6" />
                                                <span className="text-sm font-medium">Light</span>
                                            </div>
                                            <div
                                                className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'dark' ? 'border-primary' : 'border-muted'}`}
                                                onClick={() => setTheme('dark')}
                                            >
                                                <Moon className="mb-2 h-6 w-6" />
                                                <span className="text-sm font-medium">Dark</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer opacity-50">
                                                <span className="mb-2 text-xl">💻</span>
                                                <span className="text-sm font-medium">System</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
