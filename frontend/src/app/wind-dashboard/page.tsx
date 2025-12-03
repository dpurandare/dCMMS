'use client';

import React from 'react';
import { WindFarmDashboard } from '@/components/wind/WindFarmDashboard';
import { TurbineHealth } from '@/components/wind/TurbineHealthHeatmap';
import { PowerCorrelationPoint } from '@/components/wind/WindPowerCorrelation';

// Mock Data Generators
const generateMockData = () => {
    const turbines: TurbineHealth[] = [];
    const correlationData: PowerCorrelationPoint[] = [];

    // Generate 50 turbines
    for (let i = 1; i <= 50; i++) {
        const id = `WT-${i.toString().padStart(3, '0')}`;
        const windSpeed = 5 + Math.random() * 15; // 5-20 m/s

        // Theoretical power curve (simplified cubic)
        // Rated power 2000kW at 12m/s
        let expectedPower = 0;
        if (windSpeed < 3) expectedPower = 0;
        else if (windSpeed > 25) expectedPower = 0;
        else if (windSpeed >= 12) expectedPower = 2000;
        else expectedPower = 2000 * Math.pow((windSpeed - 3) / (12 - 3), 3);

        // Add some noise/inefficiency
        const efficiency = 0.9 + Math.random() * 0.15; // 90-105%
        const powerOutput = Math.min(expectedPower * efficiency, 2200);

        // Determine status
        let status: any = 'operational';
        if (Math.random() < 0.05) status = 'offline';
        else if (Math.random() < 0.05) status = 'maintenance';
        else if (Math.random() < 0.1) status = 'warning';
        else if (Math.random() < 0.02) status = 'critical';

        // If offline/maintenance, power is 0
        const finalPower = (status === 'offline' || status === 'maintenance') ? 0 : powerOutput;

        turbines.push({
            id,
            name: id,
            status,
            powerOutputKw: Math.round(finalPower),
            windSpeedMs: Number(windSpeed.toFixed(1)),
        });

        if (status === 'operational' || status === 'warning') {
            correlationData.push({
                windSpeed: Number(windSpeed.toFixed(1)),
                powerOutput: Math.round(finalPower),
                turbineId: id,
                status,
            });
        }
    }

    return { turbines, correlationData };
};

const generateTheoreticalCurve = () => {
    const points = [];
    for (let ws = 0; ws <= 25; ws += 0.5) {
        let power = 0;
        if (ws < 3) power = 0;
        else if (ws > 25) power = 0;
        else if (ws >= 12) power = 2000;
        else power = 2000 * Math.pow((ws - 3) / (12 - 3), 3);

        points.push({ windSpeed: ws, powerOutput: Math.round(power) });
    }
    return points;
};

export default function WindDashboardPage() {
    const { turbines, correlationData } = generateMockData();
    const theoreticalCurve = generateTheoreticalCurve();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Wind Farm Dashboard</h2>
            </div>
            <WindFarmDashboard
                turbines={turbines}
                correlationData={correlationData}
                theoreticalCurve={theoreticalCurve}
            />
        </div>
    );
}
