import React from "react";
import { DashboardWidget } from "@/types/dashboard";
import { KPICard } from "./widgets/kpi-card";
import { ChartWidget } from "./widgets/chart-widget";

interface DashboardGridProps {
    widgets: DashboardWidget[];
    loading?: boolean;
}

export function DashboardGrid({ widgets, loading }: DashboardGridProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <KPICard key={i} title="Loading..." value="-" loading={true} />
                ))}
            </div>
        );
    }

    // Sort widgets by layout position (y, then x)
    const sortedWidgets = [...widgets].sort((a, b) => {
        if (a.layout.y === b.layout.y) {
            return a.layout.x - b.layout.x;
        }
        return a.layout.y - b.layout.y;
    });

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-min">
            {sortedWidgets.map((widget) => {
                const colSpan = widget.layout.w === 4 ? "col-span-4" : widget.layout.w === 2 ? "col-span-2" : "col-span-1";
                const rowSpan = widget.layout.h > 1 ? `row-span-${widget.layout.h}` : "";

                return (
                    <div key={widget.id} className={`${colSpan} ${rowSpan} min-h-[150px]`}>
                        {widget.type === "kpi" && (
                            <KPICard
                                title={widget.title}
                                value={widget.data?.value || "-"}
                                unit={widget.config?.unit}
                                trend={widget.data?.trend}
                                error={widget.error}
                            />
                        )}
                        {(widget.type === "chart" || widget.type === "table") && (
                            <ChartWidget
                                title={widget.title}
                                type={widget.config?.chartType || "line"}
                                data={widget.data || []}
                                xAxisKey={widget.config?.xAxisKey || "date"}
                                series={widget.config?.series || []}
                                error={widget.error}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
