import { z } from 'zod';

export const PowerCurvePointSchema = z.object({
    wind_speed: z.number().min(0),
    power_output: z.number().min(0),
});

export const PowerCurveDataSchema = z.object({
    points: z.array(PowerCurvePointSchema),
    cut_in_speed: z.number().min(0),
    cut_out_speed: z.number().min(0),
    rated_power: z.number().min(0),
});

export type PowerCurvePoint = z.infer<typeof PowerCurvePointSchema>;
export type PowerCurveData = z.infer<typeof PowerCurveDataSchema>;

export class WindPowerCurveService {
    /**
     * Validates the power curve data structure
     */
    validatePowerCurve(data: unknown): boolean {
        const result = PowerCurveDataSchema.safeParse(data);
        return result.success;
    }

    /**
     * Calculates the expected power output for a given wind speed using linear interpolation
     */
    calculateExpectedPower(windSpeed: number, powerCurve: PowerCurveData): number {
        // 1. Check operational limits
        if (windSpeed < powerCurve.cut_in_speed || windSpeed > powerCurve.cut_out_speed) {
            return 0;
        }

        // 2. Sort points by wind speed to ensure correct interpolation
        const sortedPoints = [...powerCurve.points].sort((a, b) => a.wind_speed - b.wind_speed);

        // 3. Find the two points surrounding the current wind speed
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const p1 = sortedPoints[i];
            const p2 = sortedPoints[i + 1];

            if (windSpeed >= p1.wind_speed && windSpeed <= p2.wind_speed) {
                // 4. Linear interpolation
                // y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
                const slope = (p2.power_output - p1.power_output) / (p2.wind_speed - p1.wind_speed);
                const interpolatedPower = p1.power_output + (windSpeed - p1.wind_speed) * slope;

                // Cap at rated power just in case
                return Math.min(interpolatedPower, powerCurve.rated_power);
            }
        }

        // If we're here, we might be at the exact last point or slightly off due to floating point
        // but within cut-out speed. Return the closest point's power or 0.
        if (windSpeed >= sortedPoints[sortedPoints.length - 1].wind_speed) {
            return Math.min(sortedPoints[sortedPoints.length - 1].power_output, powerCurve.rated_power);
        }

        return 0;
    }

    /**
     * Calculates efficiency (Actual / Expected)
     */
    calculateEfficiency(actualPower: number, expectedPower: number): number {
        if (expectedPower <= 0) return 0;
        return Math.min(Math.max(actualPower / expectedPower, 0), 1.5); // Cap at 150% to avoid crazy outliers
    }
}

export const windPowerCurveService = new WindPowerCurveService();
