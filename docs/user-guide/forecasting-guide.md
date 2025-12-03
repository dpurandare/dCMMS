# Power Generation Forecasting Guide

## Overview

The Power Generation Forecasting module uses advanced Machine Learning (ARIMA/SARIMA) to predict future power output for both Solar and Wind assets. This helps in:

- **Maintenance Planning**: Scheduling downtime during low-production windows.
- **Grid Compliance**: Meeting generation commitment targets.
- **Performance Monitoring**: Identifying underperforming assets by comparing actual vs. expected generation.

## Supported Models

### Solar Forecasting
- **Algorithm**: SARIMA (Seasonal Auto-Regressive Integrated Moving Average)
- **Seasonality**: 24-hour daily cycle
- **Inputs**: Historical generation, Irradiance, Temperature, Cloud Cover
- **Horizon**: Up to 48 hours

### Wind Forecasting
- **Algorithm**: SARIMA
- **Seasonality**: 24-hour cycle (96 x 15-minute intervals)
- **Inputs**: Historical generation, Wind Speed, Wind Direction, Air Density
- **Horizon**: Up to 24 hours

## Generating a Forecast

1. Navigate to the **Asset Details** page for a Solar Inverter or Wind Turbine.
2. Click on the **Forecast** tab.
3. Click **Generate Forecast**.
4. Select the **Horizon** (e.g., 24 hours, 48 hours).
5. The system will process the request and display the forecast chart.

## Understanding the Results

### Forecast Chart
- **Solid Line**: Predicted generation (MW).
- **Shaded Area**: 95% Confidence Interval. The actual generation is expected to fall within this range 95% of the time.

### Accuracy Metrics
The system automatically calculates accuracy metrics by comparing forecasts with actual telemetry data:

- **MAPE (Mean Absolute Percentage Error)**: Lower is better. Target < 15% for Solar.
- **RMSE (Root Mean Squared Error)**: Standard deviation of the prediction errors.
- **R² Score**: Indicates how well the model fits the data (closer to 1.0 is better).

## Troubleshooting

- **"Insufficient Data"**: The model requires at least 30 days of historical telemetry to generate accurate forecasts.
- **"Flat Forecast"**: If weather data is missing, the model may revert to a persistence baseline (predicting tomorrow will be like today).
