"use client";

import React, { useEffect, useState } from "react";
import { GenAIDocument, GenAIService } from "@/services/genai.service";
import { format } from "date-fns";
import { Loader2, Trash2, FileText, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function DocumentList() {
    const [documents, setDocuments] = useState<GenAIDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const docs = await GenAIService.getDocuments();
            setDocuments(docs);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}? This action cannot be undone.`)) return;

        setDeleting(filename);
        try {
            await GenAIService.deleteDocument(filename);
            await fetchDocuments(); // Refresh list
        } catch (error) {
            console.error("Failed to delete document", error);
            alert("Failed to delete document");
        } finally {
            setDeleting(null);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Ingested Documents</CardTitle>
                        <CardDescription>Manage documents available in the Knowledge Base</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading && documents.length === 0 ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">Loading documents...</span>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                        <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <h3 className="text-sm font-medium text-gray-900">No documents found</h3>
                        <p className="text-sm text-gray-500 mt-1">Upload PDF files to get started.</p>
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Filename</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead>Chunks</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map((doc) => (
                                    <TableRow key={doc.filename}>
                                        <TableCell className="font-medium flex items-center">
                                            <FileText className="h-4 w-4 text-blue-500 mr-2" />
                                            {doc.filename}
                                        </TableCell>
                                        <TableCell>
                                            {doc.uploadedAt ? format(new Date(doc.uploadedAt), "PPP p") : "N/A"}
                                        </TableCell>
                                        <TableCell>{doc.chunkCount}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(doc.filename)}
                                                disabled={deleting === doc.filename}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {deleting === doc.filename ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
