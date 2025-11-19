#!/usr/bin/env python3
"""
ARIMA/SARIMA Forecasting Models for Power Generation
Sprint 19 (DCMMS-152, DCMMS-153)

This module implements ARIMA and SARIMA models for forecasting:
- Solar power generation (hourly, 48-hour horizon)
- Wind power generation (15-minute, 24-hour horizon)

Performance Targets:
- Solar: MAPE <15% (Mean Absolute Percentage Error)
- Wind: MAE <10% of capacity

Author: dCMMS Development Team
Date: November 19, 2025
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# ARIMA/SARIMA libraries
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.arima.model import ARIMA
try:
    from pmdarima import auto_arima
    PMDARIMA_AVAILABLE = True
except ImportError:
    PMDARIMA_AVAILABLE = False
    print("Warning: pmdarima not installed. Auto-ARIMA tuning will not be available.")

# Logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PowerGenerationForecaster:
    """
    Base class for power generation forecasting using ARIMA/SARIMA models.
    """

    def __init__(
        self,
        model_name: str,
        model_version: str = "v1.0",
        algorithm: str = "SARIMA",
    ):
        """
        Initialize the forecaster.

        Args:
            model_name: Model identifier (e.g., "arima_solar_v1", "sarima_wind_v1")
            model_version: Model version string
            algorithm: Algorithm to use ("ARIMA" or "SARIMA")
        """
        self.model_name = model_name
        self.model_version = model_version
        self.algorithm = algorithm
        self.model = None
        self.model_fit = None
        self.training_data_end_date = None
        self.accuracy_metrics = {}

    def prepare_data(
        self,
        generation_data: pd.DataFrame,
        weather_data: pd.DataFrame,
        target_column: str = "generation_mw",
    ) -> pd.DataFrame:
        """
        Prepare data for time-series forecasting.

        Args:
            generation_data: Historical generation data with timestamp index
            weather_data: Weather data (irradiation, wind speed, temperature)
            target_column: Column name for generation values

        Returns:
            Prepared DataFrame with aligned data
        """
        logger.info("Preparing data for forecasting...")

        # Ensure timestamp index
        if not isinstance(generation_data.index, pd.DatetimeIndex):
            generation_data.index = pd.to_datetime(generation_data["timestamp"])

        if not isinstance(weather_data.index, pd.DatetimeIndex):
            weather_data.index = pd.to_datetime(weather_data["timestamp"])

        # Merge generation and weather data
        df = generation_data.join(weather_data, how="left", rsuffix="_weather")

        # Handle missing values (forward fill, then backward fill)
        df = df.fillna(method="ffill").fillna(method="bfill")

        # Ensure no negative generation values
        df[target_column] = df[target_column].clip(lower=0)

        logger.info(f"Data prepared: {len(df)} records from {df.index.min()} to {df.index.max()}")

        return df

    def fit(
        self,
        data: pd.DataFrame,
        target_column: str = "generation_mw",
        exog_columns: Optional[List[str]] = None,
        seasonal_period: Optional[int] = None,
        auto_tune: bool = True,
    ) -> None:
        """
        Fit ARIMA/SARIMA model to historical data.

        Args:
            data: Historical data with timestamp index
            target_column: Target variable (generation)
            exog_columns: Exogenous variables (weather features)
            seasonal_period: Seasonal period (24 for hourly solar, 96 for 15-min wind)
            auto_tune: Use auto-ARIMA for hyperparameter tuning
        """
        logger.info(f"Fitting {self.algorithm} model...")

        # Extract target and exogenous variables
        y = data[target_column]
        exog = data[exog_columns] if exog_columns else None

        if self.algorithm == "SARIMA" and seasonal_period:
            # SARIMA model with seasonality
            if auto_tune and PMDARIMA_AVAILABLE:
                logger.info("Auto-tuning SARIMA parameters...")
                self.model = auto_arima(
                    y,
                    exogenous=exog,
                    seasonal=True,
                    m=seasonal_period,  # Seasonal period
                    stepwise=True,
                    suppress_warnings=True,
                    error_action="ignore",
                    max_order=5,
                    trace=True,
                )
                self.model_fit = self.model
            else:
                # Default SARIMA(1,1,1)(1,1,1,m) configuration
                logger.info("Using default SARIMA configuration...")
                order = (1, 1, 1)  # (p, d, q)
                seasonal_order = (1, 1, 1, seasonal_period)  # (P, D, Q, m)
                self.model = SARIMAX(
                    y,
                    exog=exog,
                    order=order,
                    seasonal_order=seasonal_order,
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                self.model_fit = self.model.fit(disp=False)

        elif self.algorithm == "ARIMA":
            # ARIMA model (no seasonality)
            if auto_tune and PMDARIMA_AVAILABLE:
                logger.info("Auto-tuning ARIMA parameters...")
                self.model = auto_arima(
                    y,
                    exogenous=exog,
                    seasonal=False,
                    stepwise=True,
                    suppress_warnings=True,
                    error_action="ignore",
                    max_order=5,
                    trace=True,
                )
                self.model_fit = self.model
            else:
                # Default ARIMA(2,1,2) configuration
                logger.info("Using default ARIMA configuration...")
                order = (2, 1, 2)  # (p, d, q)
                self.model = ARIMA(y, exog=exog, order=order)
                self.model_fit = self.model.fit()

        self.training_data_end_date = data.index.max()
        logger.info(f"Model fitted successfully. Training end date: {self.training_data_end_date}")

        # Log model summary
        if hasattr(self.model_fit, "summary"):
            logger.info(f"\n{self.model_fit.summary()}")

    def forecast(
        self,
        steps: int,
        exog_future: Optional[pd.DataFrame] = None,
        confidence_interval: float = 0.95,
    ) -> Dict:
        """
        Generate forecast for future time steps.

        Args:
            steps: Number of time steps to forecast
            exog_future: Future exogenous variables (weather forecasts)
            confidence_interval: Confidence interval (default 95%)

        Returns:
            Dictionary with forecast, lower/upper bounds, and metadata
        """
        if self.model_fit is None:
            raise ValueError("Model not fitted. Call fit() first.")

        logger.info(f"Generating forecast for {steps} steps...")

        # Generate forecast
        if PMDARIMA_AVAILABLE and hasattr(self.model_fit, "predict"):
            # pmdarima model
            forecast_result = self.model_fit.predict(
                n_periods=steps,
                exogenous=exog_future,
                return_conf_int=True,
                alpha=1 - confidence_interval,
            )
            if isinstance(forecast_result, tuple):
                forecast_values = forecast_result[0]
                conf_int = forecast_result[1]
            else:
                forecast_values = forecast_result
                conf_int = None
        else:
            # statsmodels model
            forecast_result = self.model_fit.get_forecast(steps=steps, exog=exog_future)
            forecast_values = forecast_result.predicted_mean
            conf_int = forecast_result.conf_int(alpha=1 - confidence_interval)

        # Ensure non-negative forecasts (power generation cannot be negative)
        forecast_values = np.maximum(forecast_values, 0)

        # Extract confidence intervals
        if conf_int is not None:
            lower_bound = np.maximum(conf_int[:, 0], 0)
            upper_bound = np.maximum(conf_int[:, 1], 0)
        else:
            # Approximate confidence interval using std dev
            std_dev = forecast_values * 0.15  # Assume 15% uncertainty
            lower_bound = np.maximum(forecast_values - 1.96 * std_dev, 0)
            upper_bound = forecast_values + 1.96 * std_dev

        return {
            "forecast": forecast_values,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "std_dev": (upper_bound - lower_bound) / (2 * 1.96),
            "model_name": self.model_name,
            "model_version": self.model_version,
            "algorithm": self.algorithm,
            "confidence_interval": confidence_interval,
        }

    def calculate_accuracy(
        self,
        actual: np.ndarray,
        predicted: np.ndarray,
    ) -> Dict[str, float]:
        """
        Calculate forecast accuracy metrics.

        Args:
            actual: Actual generation values
            predicted: Predicted generation values

        Returns:
            Dictionary of accuracy metrics
        """
        # Remove NaN values
        mask = ~(np.isnan(actual) | np.isnan(predicted))
        actual = actual[mask]
        predicted = predicted[mask]

        if len(actual) == 0:
            return {}

        # Mean Absolute Error (MAE)
        mae = np.mean(np.abs(actual - predicted))

        # Mean Absolute Percentage Error (MAPE)
        # Avoid division by zero
        mape = np.mean(np.abs((actual - predicted) / (actual + 1e-10))) * 100

        # Root Mean Squared Error (RMSE)
        rmse = np.sqrt(np.mean((actual - predicted) ** 2))

        # R² Score
        ss_res = np.sum((actual - predicted) ** 2)
        ss_tot = np.sum((actual - np.mean(actual)) ** 2)
        r_squared = 1 - (ss_res / (ss_tot + 1e-10))

        # Forecast Skill Score (vs naive persistence model)
        # Persistence model: tomorrow = today
        persistence_error = np.mean(np.abs(actual[1:] - actual[:-1]))
        forecast_skill = 1 - (mae / (persistence_error + 1e-10))

        metrics = {
            "mae": mae,
            "mape": mape,
            "rmse": rmse,
            "r_squared": r_squared,
            "forecast_skill_score": forecast_skill,
        }

        self.accuracy_metrics = metrics
        logger.info(f"Accuracy metrics: MAE={mae:.3f}, MAPE={mape:.2f}%, RMSE={rmse:.3f}, R²={r_squared:.4f}")

        return metrics


class SolarGenerationForecaster(PowerGenerationForecaster):
    """
    SARIMA model for solar power generation forecasting.

    Forecast Horizon: 48 hours (hourly granularity)
    Performance Target: MAPE <15%
    """

    def __init__(self):
        super().__init__(
            model_name="arima_solar",
            model_version="v1.0",
            algorithm="SARIMA",
        )
        self.seasonal_period = 24  # 24-hour daily seasonality

    def fit_solar_model(
        self,
        generation_data: pd.DataFrame,
        weather_data: pd.DataFrame,
    ) -> None:
        """
        Fit SARIMA model for solar generation.

        Args:
            generation_data: Historical solar generation (hourly)
            weather_data: Weather data (irradiation, temperature, cloud cover)
        """
        # Prepare data
        df = self.prepare_data(generation_data, weather_data)

        # Exogenous features for solar forecasting
        exog_columns = [
            "irradiation_wh_m2",  # Global Horizontal Irradiance
            "temperature_c",       # Temperature
            "cloud_cover_percent", # Cloud cover
        ]

        # Ensure all exogenous columns exist
        exog_columns = [col for col in exog_columns if col in df.columns]

        # Fit SARIMA model
        self.fit(
            data=df,
            target_column="generation_mw",
            exog_columns=exog_columns if exog_columns else None,
            seasonal_period=self.seasonal_period,
            auto_tune=True,
        )

    def forecast_solar(
        self,
        hours_ahead: int = 48,
        weather_forecast: Optional[pd.DataFrame] = None,
    ) -> Dict:
        """
        Generate solar generation forecast.

        Args:
            hours_ahead: Forecast horizon in hours (default 48)
            weather_forecast: Future weather forecast data

        Returns:
            Forecast dictionary with predictions and confidence intervals
        """
        return self.forecast(steps=hours_ahead, exog_future=weather_forecast)


class WindGenerationForecaster(PowerGenerationForecaster):
    """
    SARIMA model for wind power generation forecasting.

    Forecast Horizon: 24 hours (15-minute granularity)
    Performance Target: MAE <10% of capacity
    """

    def __init__(self):
        super().__init__(
            model_name="sarima_wind",
            model_version="v1.0",
            algorithm="SARIMA",
        )
        self.seasonal_period = 96  # 96 x 15-minute periods = 24 hours

    def fit_wind_model(
        self,
        generation_data: pd.DataFrame,
        weather_data: pd.DataFrame,
    ) -> None:
        """
        Fit SARIMA model for wind generation.

        Args:
            generation_data: Historical wind generation (15-minute)
            weather_data: Weather data (wind speed, direction, temperature)
        """
        # Prepare data
        df = self.prepare_data(generation_data, weather_data)

        # Exogenous features for wind forecasting
        exog_columns = [
            "wind_speed_ms",       # Wind speed (most important)
            "wind_direction_deg",  # Wind direction
            "air_density_kg_m3",   # Air density (affects power output)
        ]

        # Ensure all exogenous columns exist
        exog_columns = [col for col in exog_columns if col in df.columns]

        # Fit SARIMA model
        self.fit(
            data=df,
            target_column="generation_mw",
            exog_columns=exog_columns if exog_columns else None,
            seasonal_period=self.seasonal_period,
            auto_tune=True,
        )

    def forecast_wind(
        self,
        hours_ahead: int = 24,
        weather_forecast: Optional[pd.DataFrame] = None,
    ) -> Dict:
        """
        Generate wind generation forecast.

        Args:
            hours_ahead: Forecast horizon in hours (default 24)
            weather_forecast: Future weather forecast data

        Returns:
            Forecast dictionary with predictions and confidence intervals
        """
        # Convert hours to 15-minute steps
        steps = hours_ahead * 4
        return self.forecast(steps=steps, exog_future=weather_forecast)


# ==========================================
# Example Usage
# ==========================================

if __name__ == "__main__":
    logger.info("ARIMA/SARIMA Forecasting Models - Example Usage")

    # Example: Solar Forecasting
    logger.info("\n" + "="*60)
    logger.info("SOLAR GENERATION FORECASTING")
    logger.info("="*60)

    # Create sample solar generation data (hourly, 30 days)
    dates = pd.date_range(start="2025-10-01", end="2025-10-31", freq="H")
    solar_gen = pd.DataFrame({
        "timestamp": dates,
        "generation_mw": 10 * np.sin(np.arange(len(dates)) * 2 * np.pi / 24) + 10 + np.random.randn(len(dates)) * 2,
    })
    solar_gen["generation_mw"] = solar_gen["generation_mw"].clip(lower=0)  # No negative generation
    solar_gen.set_index("timestamp", inplace=True)

    # Sample weather data
    weather = pd.DataFrame({
        "timestamp": dates,
        "irradiation_wh_m2": 500 + 300 * np.sin(np.arange(len(dates)) * 2 * np.pi / 24) + np.random.randn(len(dates)) * 50,
        "temperature_c": 25 + 5 * np.sin(np.arange(len(dates)) * 2 * np.pi / 24) + np.random.randn(len(dates)) * 2,
        "cloud_cover_percent": np.random.randint(0, 100, len(dates)),
    })
    weather.set_index("timestamp", inplace=True)

    # Fit solar forecaster
    solar_forecaster = SolarGenerationForecaster()
    solar_forecaster.fit_solar_model(solar_gen, weather)

    # Generate 48-hour forecast
    forecast = solar_forecaster.forecast_solar(hours_ahead=48)
    logger.info(f"\nSolar Forecast (48 hours ahead):")
    logger.info(f"  Mean: {np.mean(forecast['forecast']):.2f} MW")
    logger.info(f"  Min: {np.min(forecast['forecast']):.2f} MW")
    logger.info(f"  Max: {np.max(forecast['forecast']):.2f} MW")

    logger.info("\n" + "="*60)
    logger.info("Forecasting models ready for integration with dCMMS!")
    logger.info("="*60)
