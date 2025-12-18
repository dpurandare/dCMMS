"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { GenAIService, UploadResponse, JobStatus } from "@/services/genai.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
// import { useToast } from "@/components/ui/use-toast"; // Adjust path if needed

export function FileUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<UploadResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
    const [progress, setProgress] = useState(0);

    // Metadata fields
    const [assetId, setAssetId] = useState("");
    const [category, setCategory] = useState("manual");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);
    // const { toast } = useToast();

    // Poll for job status
    useEffect(() => {
        if (!jobId) return;

        const pollJobStatus = async () => {
            try {
                const status = await GenAIService.getJobStatus(jobId);
                setJobStatus(status);
                setProgress(status.progress || 0);

                // If job is complete or failed, stop polling
                if (status.state === "completed" || status.state === "failed") {
                    if (pollingInterval.current) {
                        clearInterval(pollingInterval.current);
                        pollingInterval.current = null;
                    }
                    setIsUploading(false);

                    if (status.state === "completed") {
                        setResult(status.result);
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        setJobId(null);
                    } else {
                        setError("Ingestion failed. Please try again.");
                        setJobId(null);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch job status", err);
            }
        };

        // Start polling
        pollJobStatus(); // Initial call
        pollingInterval.current = setInterval(pollJobStatus, 2000); // Poll every 2 seconds

        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, [jobId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setResult(null);
        setProgress(0);

        try {
            const resp = await GenAIService.uploadDocument(file, {
                assetId,
                category,
                type: file.type,
            });
            // Response now contains jobId instead of immediate result
            if (resp.jobId) {
                setJobId(resp.jobId);
                // Polling will handle the rest via useEffect
            } else {
                // Fallback for backwards compatibility
                setResult(resp);
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                setIsUploading(false);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Upload failed");
            setIsUploading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Ingest Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Drop Zone */}
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.txt"
                    />

                    {file ? (
                        <div className="flex flex-col items-center gap-2">
                            <FileText className="h-10 w-10 text-primary" />
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            >
                                <X className="h-4 w-4 mr-2" /> Remove
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 cursor-pointer">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <p className="font-medium">Click to upload or drag & drop</p>
                            <p className="text-xs text-muted-foreground">PDF or Text files</p>
                        </div>
                    )}
                </div>

                {/* Metadata Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="assetId">Asset ID (Optional)</Label>
                        <Input
                            id="assetId"
                            placeholder="e.g. INV-001"
                            value={assetId}
                            onChange={(e) => setAssetId(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                            id="category"
                            placeholder="e.g. manual, report"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                    </div>
                </div>

                {/* Action Button */}
                <Button
                    className="w-full"
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                >
                    {isUploading && jobId && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isUploading ? "Processing..." : "Upload & Ingest"}
                </Button>

                {/* Progress Bar */}
                {isUploading && jobId && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Processing document...</span>
                            <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-center text-muted-foreground">
                            {progress < 30 ? "Extracting text..." : progress < 100 ? "Generating embeddings..." : "Finalizing..."}
                        </p>
                    </div>
                )}

                {/* Status Messages */}
                {result && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-md">
                        <CheckCircle className="h-5 w-5" />
                        <div>
                            <p className="font-medium">Ingestion Complete</p>
                            <p className="text-xs">
                                {result.chunksIngested} / {result.chunksTotal} chunks indexed.
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
                        <AlertCircle className="h-5 w-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
