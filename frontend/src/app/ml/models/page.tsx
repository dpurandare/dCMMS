'use client';

import { useEffect, useState } from 'react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { modelGovernanceService, Model, ModelStage } from '@/services/model-governance.service';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ModelRegistryPage() {
    return (
        <PermissionGuard permission="ml.models.view" showAccessDenied>
            <ModelRegistryContent />
        </PermissionGuard>
    );
}

function ModelRegistryContent() {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStage, setFilterStage] = useState<ModelStage | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchModels = async () => {
            try {
                setLoading(true);
                // Fetch all stages if 'all' is selected, otherwise fetch specific stage
                // Since API filters by stage, we might need to fetch all if 'all' is selected.
                // For simplicity, let's assume we fetch all by iterating stages or if API supports no stage param (it requires stage in schema but let's check).
                // The backend schema says `required: ["stage"]`. So we must provide a stage.
                // We'll fetch for each stage and combine.

                const stages: ModelStage[] = ["development", "staging", "review", "production", "retired"];
                let allModels: Model[] = [];

                if (filterStage === 'all') {
                    const results = await Promise.all(stages.map(stage => modelGovernanceService.getModels(stage).catch(() => ({ models: [] }))));
                    allModels = results.flatMap(r => r.models || []);
                } else {
                    const result = await modelGovernanceService.getModels(filterStage);
                    allModels = result.models || [];
                }

                setModels(allModels);
            } catch (err) {
                console.error('Failed to fetch models', err);
            } finally {
                setLoading(false);
            }
        };

        fetchModels();
    }, [filterStage]);

    const filteredModels = models.filter(model =>
        model.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStageColor = (stage: ModelStage) => {
        switch (stage) {
            case 'production': return 'bg-green-100 text-green-800';
            case 'staging': return 'bg-blue-100 text-blue-800';
            case 'development': return 'bg-yellow-100 text-yellow-800';
            case 'review': return 'bg-purple-100 text-purple-800';
            case 'retired': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <DashboardLayout
            title="Model Registry"
            breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'ML' }, { label: 'Model Registry' }]}
            actions={
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Register Model
                </Button>
            }
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 md:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search models..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={filterStage}
                            onChange={(e) => setFilterStage(e.target.value as ModelStage | 'all')}
                        >
                            <option value="all">All Stages</option>
                            <option value="development">Development</option>
                            <option value="staging">Staging</option>
                            <option value="review">Review</option>
                            <option value="production">Production</option>
                            <option value="retired">Retired</option>
                        </select>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Registered Models</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="p-4 text-left font-medium">Model Name</th>
                                        <th className="p-4 text-left font-medium">Version</th>
                                        <th className="p-4 text-left font-medium">Stage</th>
                                        <th className="p-4 text-left font-medium">Owner</th>
                                        <th className="p-4 text-left font-medium">Last Updated</th>
                                        <th className="p-4 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center">Loading...</td>
                                        </tr>
                                    ) : filteredModels.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                                No models found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredModels.map((model) => (
                                            <tr key={model.id} className="border-b last:border-0 hover:bg-muted/50">
                                                <td className="p-4 font-medium">{model.modelName}</td>
                                                <td className="p-4">{model.version}</td>
                                                <td className="p-4">
                                                    <Badge variant="outline" className={getStageColor(model.stage)}>
                                                        {model.stage}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">{model.owner}</td>
                                                <td className="p-4">{new Date(model.lastUpdated).toLocaleDateString()}</td>
                                                <td className="p-4 text-right">
                                                    <Button variant="ghost" size="sm">Details</Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
