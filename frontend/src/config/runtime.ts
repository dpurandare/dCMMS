/**
 * Runtime Application Configuration
 * 
 * Centralized runtime configuration with environment-based settings
 */

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface RuntimeConfig {
    environment: Environment;
    isDevelopment: boolean;
    isProduction: boolean;

    features: {
        enableGenAI: boolean;
        enableMobileSync: boolean;
        enableAnalytics: boolean;
        enableAdvancedForecasting: boolean;
        enableComplianceReporting: boolean;
    };

    security: {
        enableCSRF: boolean;
        sessionTimeout: number; // minutes
        tokenRefreshInterval: number; // minutes
        maxLoginAttempts: number;
    };

    app: {
        name: string;
        version: string;
    };
}

const env = (process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || 'development') as Environment;

export const runtimeConfig: RuntimeConfig = {
    environment: env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',

    features: {
        enableGenAI: process.env.NEXT_PUBLIC_ENABLE_GENAI !== 'false',
        enableMobileSync: process.env.NEXT_PUBLIC_ENABLE_MOBILE_SYNC !== 'false',
        enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
        enableAdvancedForecasting: process.env.NEXT_PUBLIC_ENABLE_FORECASTING !== 'false',
        enableComplianceReporting: process.env.NEXT_PUBLIC_ENABLE_COMPLIANCE !== 'false',
    },

    security: {
        enableCSRF: process.env.NEXT_PUBLIC_ENABLE_CSRF === 'true',
        sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '60', 10),
        tokenRefreshInterval: parseInt(process.env.NEXT_PUBLIC_TOKEN_REFRESH_INTERVAL || '14', 10),
        maxLoginAttempts: parseInt(process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS || '5', 10),
    },

    app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'dCMMS',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    },
};

export function isFeatureEnabled(feature: keyof RuntimeConfig['features']): boolean {
    return runtimeConfig.features[feature];
}
