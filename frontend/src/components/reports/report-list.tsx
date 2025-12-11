"use client";

import { useState, useEffect } from "react";
import { ReportDefinition } from "@/types/report";
import { reportService } from "@/services/report.service";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Play, Edit, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

interface ReportListProps {
    onRun: (report: ReportDefinition) => void;
    onEdit: (report: ReportDefinition) => void;
    executingReportId?: string | null;
}

export function ReportList({ onRun, onEdit, executingReportId }: ReportListProps) {
    const [reports, setReports] = useState<ReportDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const list = await reportService.list();
            setReports(list);
        } catch (error) {
            console.error("Failed to load reports", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            await reportService.delete(id);
            setReports(reports.filter((r) => r.id !== id));
        } catch (error) {
            console.error("Failed to delete report", error);
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading reports...</div>;
    }

    if (reports.length === 0) {
        return (
            <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No reports created</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        You haven&apos;t created any reports yet. Create one to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Datasource</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.map((report) => (
                        <TableRow key={report.id}>
                            <TableCell className="font-medium">{report.name}</TableCell>
                            <TableCell>{report.description}</TableCell>
                            <TableCell className="capitalize">
                                {report.datasource.replace("_", " ")}
                            </TableCell>
                            <TableCell>
                                {format(new Date(report.updatedAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onRun(report)}
                                        title="Run Report"
                                        disabled={executingReportId === report.id}
                                    >
                                        {executingReportId === report.id ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-green-600" />
                                        ) : (
                                            <Play className="h-4 w-4 text-green-600" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(report)}
                                        title="Edit Report"
                                    >
                                        <Edit className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(report.id)}
                                        title="Delete Report"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
