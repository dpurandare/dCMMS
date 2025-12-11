import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    unit?: string;
    trend?: {
        value: number;
        direction: "up" | "down" | "neutral";
        label?: string;
    };
    icon?: React.ReactNode;
    loading?: boolean;
    error?: string;
}

export function KPICard({ title, value, unit, trend, icon, loading, error }: KPICardProps) {
    if (loading) {
        return (
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="h-full border-destructive/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-destructive">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon && <div className="text-muted-foreground">{icon}</div>}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {value}
                    {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
                </div>
                {trend && (
                    <div className="flex items-center pt-1 text-xs text-muted-foreground">
                        {trend.direction === "up" && <ArrowUpIcon className="mr-1 h-4 w-4 text-green-500" />}
                        {trend.direction === "down" && <ArrowDownIcon className="mr-1 h-4 w-4 text-red-500" />}
                        {trend.direction === "neutral" && <MinusIcon className="mr-1 h-4 w-4" />}
                        <span
                            className={
                                trend.direction === "up"
                                    ? "text-green-500"
                                    : trend.direction === "down"
                                        ? "text-red-500"
                                        : ""
                            }
                        >
                            {Math.abs(trend.value)}%
                        </span>
                        <span className="ml-1">{trend.label || "vs last period"}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
