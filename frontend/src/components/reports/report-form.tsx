'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ReportDefinition, CreateReportDTO, UpdateReportDTO } from '@/types/report';
import { reportService } from '@/services/report.service';
import { Loader2 } from 'lucide-react';

interface ReportFormProps {
    report?: ReportDefinition;
    onSuccess: (report: ReportDefinition) => void;
    onCancel: () => void;
}

export function ReportForm({ report, onSuccess, onCancel }: ReportFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingFields, setIsFetchingFields] = useState(false);
    const [availableFields, setAvailableFields] = useState<{ name: string; type: string }[]>([]);

    const [formData, setFormData] = useState<CreateReportDTO>({
        name: report?.name || '',
        description: report?.description || '',
        datasource: report?.datasource || 'work_orders',
        config: report?.config || { columns: [], filters: [] },
        isPublic: report?.isPublic || false
    });

    useEffect(() => {
        if (formData.datasource) {
            fetchFields(formData.datasource);
        }
    }, [formData.datasource]);

    const fetchFields = async (datasource: string) => {
        try {
            setIsFetchingFields(true);
            const fields = await reportService.getAvailableFields(datasource);
            setAvailableFields(fields);
        } catch (error) {
            console.error("Failed to fetch fields", error);
        } finally {
            setIsFetchingFields(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let result: ReportDefinition;
            if (report) {
                result = await reportService.update(report.id, formData);
            } else {
                result = await reportService.create(formData);
            }
            onSuccess(result);
        } catch (error) {
            console.error("Failed to save report", error);
            alert("Failed to save report");
        } finally {
            setIsLoading(false);
        }
    };

    const handleColumnToggle = (column: string) => {
        const currentColumns = formData.config.columns || [];
        const newColumns = currentColumns.includes(column)
            ? currentColumns.filter((c: string) => c !== column)
            : [...currentColumns, column];

        setFormData({
            ...formData,
            config: { ...formData.config, columns: newColumns }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Report Name</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="datasource">Datasource</Label>
                <Select
                    value={formData.datasource}
                    onValueChange={(value) => setFormData({ ...formData, datasource: value, config: { ...formData.config, columns: [] } })}
                    disabled={!!report} // Disable changing datasource for existing reports
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select datasource" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="work_orders">Work Orders</SelectItem>
                        <SelectItem value="assets">Assets</SelectItem>
                        <SelectItem value="telemetry">Telemetry</SelectItem>
                        <SelectItem value="alarms">Alarms</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Columns</Label>
                {isFetchingFields ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading fields...
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 border rounded-md p-4 max-h-[200px] overflow-y-auto">
                        {availableFields.map((field) => (
                            <div key={field.name} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`col-${field.name}`}
                                    checked={(formData.config.columns || []).includes(field.name)}
                                    onCheckedChange={() => handleColumnToggle(field.name)}
                                />
                                <Label htmlFor={`col-${field.name}`} className="text-sm font-normal cursor-pointer">
                                    {field.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {report ? 'Update Report' : 'Create Report'}
                </Button>
            </div>
        </form>
    );
}
