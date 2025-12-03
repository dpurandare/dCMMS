import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, Line } from 'recharts';

export interface PowerCorrelationPoint {
    windSpeed: number;
    powerOutput: number;
    turbineId: string;
    status: string;
}

interface WindPowerCorrelationProps {
    data: PowerCorrelationPoint[];
    theoreticalCurve?: { windSpeed: number; powerOutput: number }[];
}

export function WindPowerCorrelation({ data, theoreticalCurve }: WindPowerCorrelationProps) {
    return (
        <Card className="w-full h-[400px]">
            <CardHeader>
                <CardTitle>Power Curve Correlation</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                        margin={{
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 20,
                        }}
                    >
                        <CartesianGrid />
                        <XAxis type="number" dataKey="windSpeed" name="Wind Speed" unit=" m/s" domain={[0, 25]} />
                        <YAxis type="number" dataKey="powerOutput" name="Power" unit=" kW" />
                        <ZAxis type="category" dataKey="turbineId" name="Turbine" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        <Scatter name="Actual Generation" data={data} fill="#8884d8" />
                        {theoreticalCurve && (
                            <Scatter name="Theoretical Curve" data={theoreticalCurve} line shape="cross" fill="#82ca9d" />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
