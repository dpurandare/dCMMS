import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { Loader2, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface AdvancedForecastDashboardProps {
    siteId: string; // Used for API calls (mocked for now)
}

// Mock data generator for different models
const generateForecastData = (horizon: number, model: string) => {
    const data = [];
    const now = new Date();
    for (let i = 0; i < horizon; i++) {
        const time = new Date(now.getTime() + i * 3600 * 1000);
        const base = Math.sin((i + now.getHours()) / 24 * Math.PI * 2) * 50 + 50;

        // Add model-specific variations
        let value = base;
        let confidenceLower = base * 0.9;
        let confidenceUpper = base * 1.1;

        if (model === 'lstm') {
            value = base + Math.sin(i / 5) * 10; // Capture finer details
            confidenceLower = value * 0.95; // Higher confidence
            confidenceUpper = value * 1.05;
        } else if (model === 'transformer') {
            value = base + Math.sin(i / 5) * 10 + Math.cos(i / 3) * 5; // Even more complex patterns
            confidenceLower = value * 0.97; // Highest confidence
            confidenceUpper = value * 1.03;
        } else if (model === 'arima') {
            value = base + (Math.random() - 0.5) * 10; // Noisier
            confidenceLower = value * 0.8; // Lower confidence
            confidenceUpper = value * 1.2;
        }

        data.push({
            timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            generation: Math.max(0, value),
            lower: Math.max(0, confidenceLower),
            upper: Math.max(0, confidenceUpper),
            avg: base
        });
    }
    return data;
};

export function AdvancedForecastDashboard({ siteId }: AdvancedForecastDashboardProps) {
    const [selectedModel, setSelectedModel] = useState<string>('arima');
    const [isCrunching, setIsCrunching] = useState<boolean>(false);
    const [data, setData] = useState<any[]>(generateForecastData(24, 'arima'));

    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        setIsCrunching(true);

        // Simulate "Crunching" time based on model complexity
        const delay = model === 'transformer' ? 2000 : model === 'lstm' ? 1000 : 300;

        setTimeout(() => {
            setData(generateForecastData(24, model));
            setIsCrunching(false);
        }, delay);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Model Selector</CardTitle>
                        <CardDescription>Choose algorithm logic</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select onValueChange={handleModelChange} defaultValue={selectedModel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Algorithm" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="arima">ARIMA (Statistical)</SelectItem>
                                <SelectItem value="sarima">SARIMA (Seasonal)</SelectItem>
                                <SelectItem value="prophet">Facebook Prophet</SelectItem>
                                <SelectItem value="lstm">Deep Learning (LSTM) 🧠</SelectItem>
                                <SelectItem value="transformer">Transformer (Attention) 🚀</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Generation Forecast</CardTitle>
                        <CardDescription>Next 24 Hours</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-2xl font-bold">{data.reduce((acc, curr) => acc + curr.generation, 0).toFixed(1)} MWh</span>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Model Confidence</CardTitle>
                        <CardDescription>Accuracy Score</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-2xl font-bold">
                            {selectedModel === 'transformer' ? '98.5%' : selectedModel === 'lstm' ? '96.2%' : '89.4%'}
                        </span>
                    </CardContent>
                </Card>
            </div>

            <Card className="h-[500px]">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Forecast Trajectory</CardTitle>
                        {isCrunching && (
                            <div className="flex items-center text-sm text-blue-500 animate-pulse">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Crunching massive datasets...
                            </div>
                        )}
                    </div>
                    <CardDescription>
                        {selectedModel.toUpperCase()} projection with confidence intervals
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="timestamp" />
                            <YAxis unit=" MW" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                            />
                            <Legend />
                            {/* Confidence Interval Area */}
                            <defs>
                                <linearGradient id="confidence" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="upper"
                                stroke="none"
                                fill="url(#confidence)"
                            />

                            <Line
                                type="monotone"
                                dataKey="generation"
                                name="Forecast (MW)"
                                stroke="#8884d8"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 8 }}
                            />

                            <Line
                                type="monotone"
                                dataKey="avg"
                                name="Baseline (Avg)"
                                stroke="#82ca9d"
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
