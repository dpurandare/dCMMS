import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";

interface ChartWidgetProps {
    title: string;
    type: "line" | "bar" | "area";
    data: any[];
    xAxisKey: string;
    series: {
        key: string;
        name: string;
        color: string;
    }[];
    loading?: boolean;
    error?: string;
}

export function ChartWidget({ title, type, data, xAxisKey, series, loading, error }: ChartWidgetProps) {
    if (loading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="h-full w-full animate-pulse rounded bg-muted" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="h-full border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">{title}</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <p className="text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }

    const renderChart = () => {
        switch (type) {
            case "line":
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey={xAxisKey} className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend />
                        {series.map((s) => (
                            <Line
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name}
                                stroke={s.color}
                                strokeWidth={2}
                                dot={false}
                            />
                        ))}
                    </LineChart>
                );
            case "bar":
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey={xAxisKey} className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend />
                        {series.map((s) => (
                            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                );
            case "area":
                return (
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey={xAxisKey} className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend />
                        {series.map((s) => (
                            <Area
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name}
                                stroke={s.color}
                                fill={s.color}
                                fillOpacity={0.3}
                            />
                        ))}
                    </AreaChart>
                );
            default:
                return null;
        }
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart() || <div>Unsupported chart type</div>}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
