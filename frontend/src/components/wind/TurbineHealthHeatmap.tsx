import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type TurbineStatus = 'operational' | 'warning' | 'critical' | 'maintenance' | 'offline';

export interface TurbineHealth {
    id: string;
    name: string;
    status: TurbineStatus;
    powerOutputKw: number;
    windSpeedMs: number;
}

interface TurbineHealthHeatmapProps {
    turbines: TurbineHealth[];
    onTurbineClick?: (id: string) => void;
}

const statusColors: Record<TurbineStatus, string> = {
    operational: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    maintenance: 'bg-blue-500',
    offline: 'bg-gray-500',
};

export function TurbineHealthHeatmap({ turbines, onTurbineClick }: TurbineHealthHeatmapProps) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Turbine Health Status</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    <TooltipProvider>
                        {turbines.map((turbine) => (
                            <Tooltip key={turbine.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`aspect-square rounded-md cursor-pointer transition-all hover:opacity-80 ${statusColors[turbine.status]}`}
                                        onClick={() => onTurbineClick?.(turbine.id)}
                                    >
                                        <div className="flex items-center justify-center h-full text-white text-xs font-bold">
                                            {turbine.name.replace('WT-', '')}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-sm">
                                        <p className="font-bold">{turbine.name}</p>
                                        <p>Status: <span className="capitalize">{turbine.status}</span></p>
                                        <p>Power: {turbine.powerOutputKw} kW</p>
                                        <p>Wind: {turbine.windSpeedMs} m/s</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </div>

                <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    {Object.entries(statusColors).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color}`} />
                            <span className="capitalize">{status}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
