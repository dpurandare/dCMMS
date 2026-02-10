'use client';

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReportList } from "@/components/reports/report-list";
import { ReportForm } from "@/components/reports/report-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReportDefinition, ReportExecutionResult } from "@/types/report";
import { reportService } from "@/services/report.service";
import { useAuthStore } from '@/store/auth-store';
import { ProtectedSection } from '@/components/auth/protected';
import { usePermissions } from '@/hooks/use-permissions';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ReportsPage() {
    return (
        <ProtectedSection permissions={['read:reports']}>
            <ReportsContent />
        </ProtectedSection>
    );
}

function ReportsContent() {
    const { can } = usePermissions();
    const [executionResult, setExecutionResult] = useState<ReportExecutionResult | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [executingReportId, setExecutingReportId] = useState<string | null>(null);

    // Create/Edit Modal State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<ReportDefinition | undefined>(undefined);
    const [refreshKey, setRefreshKey] = useState(0); // To trigger list refresh

    const handleRun = async (report: ReportDefinition) => {
        setExecutingReportId(report.id);
        try {
            const result = await reportService.execute(report.id) as ReportExecutionResult;
            setExecutionResult(result);
            setShowResult(true);
        } catch (error) {
            console.error("Failed to execute report", error);
            alert("Failed to execute report: " + (error as Error).message);
        } finally {
            setExecutingReportId(null);
        }
    };

    const handleEdit = (report: ReportDefinition) => {
        setEditingReport(report);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingReport(undefined);
        setIsFormOpen(true);
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setRefreshKey(prev => prev + 1); // Refresh list
    };

    return (
        <DashboardLayout title="Reports">
            <div className="flex flex-col space-y-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
                        <p className="text-muted-foreground">
                            Create and execute custom reports from your data.
                        </p>
                    </div>
                    {can('create:reports') && (
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Report
                        </Button>
                    )}
                </div>

                <ReportList
                    key={refreshKey}
                    onRun={handleRun}
                    onEdit={handleEdit}
                    executingReportId={executingReportId}
                />

                {/* Execution Result Modal */}
                <Dialog open={showResult} onOpenChange={setShowResult}>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                            <DialogTitle>{executionResult?.name}</DialogTitle>
                            <DialogDescription>
                                Executed at {executionResult && new Date(executionResult.executedAt).toLocaleString()} - {executionResult?.rows} rows
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                            {executionResult && executionResult.data.length > 0 ? (
                                <div className="w-full overflow-auto">
                                    <table className="w-full caption-bottom text-sm">
                                        <thead className="[&_tr]:border-b">
                                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                {Object.keys(executionResult.data[0]).map((key) => (
                                                    <th key={key} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="[&_tr:last-child]:border-0">
                                            {executionResult.data.map((row, i) => (
                                                <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No data returned
                                </div>
                            )}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>

                {/* Create/Edit Report Modal */}
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingReport ? 'Edit Report' : 'Create New Report'}</DialogTitle>
                            <DialogDescription>
                                Configure your report details and data source.
                            </DialogDescription>
                        </DialogHeader>
                        <ReportForm
                            report={editingReport}
                            onSuccess={handleFormSuccess}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
