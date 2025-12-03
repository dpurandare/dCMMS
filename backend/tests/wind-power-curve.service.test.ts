import { describe, it, expect } from 'vitest';
import { windPowerCurveService, PowerCurveData } from '../src/services/wind-power-curve.service';

describe('WindPowerCurveService', () => {
    const mockPowerCurve: PowerCurveData = {
        cut_in_speed: 3,
        cut_out_speed: 25,
        rated_power: 2000,
        points: [
            { wind_speed: 0, power_output: 0 },
            { wind_speed: 3, power_output: 0 },
            { wind_speed: 4, power_output: 100 },
            { wind_speed: 8, power_output: 800 },
            { wind_speed: 12, power_output: 2000 },
            { wind_speed: 25, power_output: 2000 },
        ],
    };

    describe('validatePowerCurve', () => {
        it('should validate correct power curve data', () => {
            expect(windPowerCurveService.validatePowerCurve(mockPowerCurve)).toBe(true);
        });

        it('should reject invalid data', () => {
            expect(windPowerCurveService.validatePowerCurve({ points: [] })).toBe(false);
        });
    });

    describe('calculateExpectedPower', () => {
        it('should return 0 below cut-in speed', () => {
            expect(windPowerCurveService.calculateExpectedPower(2, mockPowerCurve)).toBe(0);
        });

        it('should return 0 above cut-out speed', () => {
            expect(windPowerCurveService.calculateExpectedPower(26, mockPowerCurve)).toBe(0);
        });

        it('should return exact value for known point', () => {
            expect(windPowerCurveService.calculateExpectedPower(8, mockPowerCurve)).toBe(800);
        });

        it('should interpolate linearly between points', () => {
            // Between 4m/s (100kW) and 8m/s (800kW)
            // At 6m/s, it should be exactly in the middle: 450kW
            expect(windPowerCurveService.calculateExpectedPower(6, mockPowerCurve)).toBe(450);
        });

        it('should cap at rated power', () => {
            expect(windPowerCurveService.calculateExpectedPower(15, mockPowerCurve)).toBe(2000);
        });
    });

    describe('calculateEfficiency', () => {
        it('should calculate 100% efficiency correctly', () => {
            expect(windPowerCurveService.calculateEfficiency(1000, 1000)).toBe(1);
        });

        it('should calculate 50% efficiency correctly', () => {
            expect(windPowerCurveService.calculateEfficiency(500, 1000)).toBe(0.5);
        });

        it('should handle 0 expected power', () => {
            expect(windPowerCurveService.calculateEfficiency(0, 0)).toBe(0);
        });

        it('should cap efficiency at 1.5', () => {
            expect(windPowerCurveService.calculateEfficiency(2000, 1000)).toBe(1.5);
        });
    });
});
