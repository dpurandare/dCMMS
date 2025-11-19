#!/usr/bin/env python3
"""
Prophet Forecasting Models for Power Generation
Sprint 19 (DCMMS-152, DCMMS-153)

Facebook Prophet is an alternative to ARIMA/SARIMA that is:
- Easy to use and robust to missing data
- Handles multiple seasonalities (daily, weekly, yearly)
- Works well with holidays and special events
- Provides uncertainty intervals automatically

This module implements Prophet models for:
- Solar power generation (hourly, 48-hour horizon)
- Wind power generation (15-minute, 24-hour horizon)

Author: dCMMS Development Team
Date: November 19, 2025
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Prophet library
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    print("Warning: prophet not installed. Prophet forecasting will not be available.")

# Logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProphetForecaster:
    """
    Base class for power generation forecasting using Facebook Prophet.
    """

    def __init__(
        self,
        model_name: str,
        model_version: str = "v1.0",
        yearly_seasonality: bool = True,
        weekly_seasonality: bool = True,
        daily_seasonality: bool = True,
    ):
        """
        Initialize the Prophet forecaster.

        Args:
            model_name: Model identifier (e.g., "prophet_solar_v1", "prophet_wind_v1")
            model_version: Model version string
            yearly_seasonality: Enable yearly seasonality
            weekly_seasonality: Enable weekly seasonality
            daily_seasonality: Enable daily seasonality
        """
        if not PROPHET_AVAILABLE:
            raise ImportError("prophet library not installed. Install with: pip install prophet")

        self.model_name = model_name
        self.model_version = model_version
        self.model = Prophet(
            yearly_seasonality=yearly_seasonality,
            weekly_seasonality=weekly_seasonality,
            daily_seasonality=daily_seasonality,
            interval_width=0.95,  # 95% confidence interval
            seasonality_mode='multiplicative',  # Better for power generation
        )
        self.training_data_end_date = None
        self.accuracy_metrics = {}
        self.regressor_columns = []

    def prepare_data(
        self,
        generation_data: pd.DataFrame,
        weather_data: Optional[pd.DataFrame] = None,
        timestamp_column: str = "timestamp",
        target_column: str = "generation_mw",
    ) -> pd.DataFrame:
        """
        Prepare data for Prophet forecasting.

        Prophet requires specific column names:
        - 'ds': datetime column
        - 'y': target variable

        Args:
            generation_data: Historical generation data
            weather_data: Optional weather data (exogenous features)
            timestamp_column: Name of timestamp column
            target_column: Name of target variable

        Returns:
            DataFrame in Prophet format
        """
        logger.info("Preparing data for Prophet forecasting...")

        # Create base DataFrame
        df = generation_data.copy()

        # Rename columns for Prophet
        if timestamp_column in df.columns:
            df = df.rename(columns={timestamp_column: "ds"})
        elif isinstance(df.index, pd.DatetimeIndex):
            df = df.reset_index().rename(columns={df.index.name or "index": "ds"})

        df = df.rename(columns={target_column: "y"})

        # Ensure datetime format
        df["ds"] = pd.to_datetime(df["ds"])

        # Merge with weather data if provided
        if weather_data is not None:
            weather_df = weather_data.copy()
            if "timestamp" in weather_df.columns:
                weather_df = weather_df.rename(columns={"timestamp": "ds"})
            elif isinstance(weather_df.index, pd.DatetimeIndex):
                weather_df = weather_df.reset_index().rename(columns={weather_df.index.name or "index": "ds"})

            weather_df["ds"] = pd.to_datetime(weather_df["ds"])
            df = df.merge(weather_df, on="ds", how="left")

        # Handle missing values
        df = df.fillna(method="ffill").fillna(method="bfill")

        # Ensure non-negative generation
        df["y"] = df["y"].clip(lower=0)

        # Keep only relevant columns (ds, y, and regressors)
        columns_to_keep = ["ds", "y"] + self.regressor_columns
        df = df[[col for col in columns_to_keep if col in df.columns]]

        logger.info(f"Data prepared: {len(df)} records from {df['ds'].min()} to {df['ds'].max()}")

        return df

    def add_regressors(self, regressor_columns: List[str]) -> None:
        """
        Add exogenous regressors (weather features) to the Prophet model.

        Args:
            regressor_columns: List of column names to use as regressors
        """
        self.regressor_columns = regressor_columns
        for col in regressor_columns:
            self.model.add_regressor(col)
        logger.info(f"Added regressors: {regressor_columns}")

    def fit(
        self,
        data: pd.DataFrame,
    ) -> None:
        """
        Fit Prophet model to historical data.

        Args:
            data: DataFrame in Prophet format (ds, y columns)
        """
        logger.info("Fitting Prophet model...")

        # Fit model
        self.model.fit(data)

        self.training_data_end_date = data["ds"].max()
        logger.info(f"Model fitted successfully. Training end date: {self.training_data_end_date}")

    def forecast(
        self,
        periods: int,
        freq: str = "H",
        future_regressors: Optional[pd.DataFrame] = None,
    ) -> Dict:
        """
        Generate forecast for future periods.

        Args:
            periods: Number of periods to forecast
            freq: Frequency string ('H' for hourly, '15T' for 15-minute)
            future_regressors: Future values of exogenous regressors

        Returns:
            Dictionary with forecast, lower/upper bounds, and metadata
        """
        logger.info(f"Generating forecast for {periods} periods (freq={freq})...")

        # Create future dataframe
        if future_regressors is not None:
            # Use provided future data (with regressors)
            future = future_regressors.copy()
            if "timestamp" in future.columns:
                future = future.rename(columns={"timestamp": "ds"})
            future["ds"] = pd.to_datetime(future["ds"])
        else:
            # Generate future dates
            future = self.model.make_future_dataframe(periods=periods, freq=freq, include_history=False)

        # Generate forecast
        forecast = self.model.predict(future)

        # Extract predictions and confidence intervals
        predictions = forecast["yhat"].values
        lower_bound = forecast["yhat_lower"].values
        upper_bound = forecast["yhat_upper"].values

        # Ensure non-negative forecasts
        predictions = np.maximum(predictions, 0)
        lower_bound = np.maximum(lower_bound, 0)
        upper_bound = np.maximum(upper_bound, 0)

        return {
            "forecast": predictions,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "std_dev": (upper_bound - lower_bound) / (2 * 1.96),
            "forecast_df": forecast,  # Full Prophet forecast DataFrame
            "model_name": self.model_name,
            "model_version": self.model_version,
            "algorithm": "Prophet",
            "confidence_interval": 0.95,
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
        mape = np.mean(np.abs((actual - predicted) / (actual + 1e-10))) * 100

        # Root Mean Squared Error (RMSE)
        rmse = np.sqrt(np.mean((actual - predicted) ** 2))

        # R² Score
        ss_res = np.sum((actual - predicted) ** 2)
        ss_tot = np.sum((actual - np.mean(actual)) ** 2)
        r_squared = 1 - (ss_res / (ss_tot + 1e-10))

        # Forecast Skill Score
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


class ProphetSolarForecaster(ProphetForecaster):
    """
    Prophet model for solar power generation forecasting.

    Forecast Horizon: 48 hours (hourly granularity)
    Performance Target: MAPE <15%
    """

    def __init__(self):
        super().__init__(
            model_name="prophet_solar",
            model_version="v1.0",
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
        )

    def fit_solar_model(
        self,
        generation_data: pd.DataFrame,
        weather_data: Optional[pd.DataFrame] = None,
    ) -> None:
        """
        Fit Prophet model for solar generation.

        Args:
            generation_data: Historical solar generation (hourly)
            weather_data: Optional weather data (irradiation, temperature, cloud cover)
        """
        # Add weather regressors if available
        if weather_data is not None:
            regressors = [
                "irradiation_wh_m2",
                "temperature_c",
                "cloud_cover_percent",
            ]
            # Filter to available columns
            available_regressors = [r for r in regressors if r in weather_data.columns]
            self.add_regressors(available_regressors)

        # Prepare data
        df = self.prepare_data(generation_data, weather_data)

        # Fit model
        self.fit(df)

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
        return self.forecast(periods=hours_ahead, freq="H", future_regressors=weather_forecast)


class ProphetWindForecaster(ProphetForecaster):
    """
    Prophet model for wind power generation forecasting.

    Forecast Horizon: 24 hours (15-minute granularity)
    Performance Target: MAE <10% of capacity
    """

    def __init__(self):
        super().__init__(
            model_name="prophet_wind",
            model_version="v1.0",
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
        )

    def fit_wind_model(
        self,
        generation_data: pd.DataFrame,
        weather_data: Optional[pd.DataFrame] = None,
    ) -> None:
        """
        Fit Prophet model for wind generation.

        Args:
            generation_data: Historical wind generation (15-minute)
            weather_data: Optional weather data (wind speed, direction, temperature)
        """
        # Add weather regressors if available
        if weather_data is not None:
            regressors = [
                "wind_speed_ms",
                "wind_direction_deg",
                "air_density_kg_m3",
            ]
            # Filter to available columns
            available_regressors = [r for r in regressors if r in weather_data.columns]
            self.add_regressors(available_regressors)

        # Prepare data
        df = self.prepare_data(generation_data, weather_data)

        # Fit model
        self.fit(df)

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
        # Convert hours to 15-minute periods
        periods = hours_ahead * 4
        return self.forecast(periods=periods, freq="15T", future_regressors=weather_forecast)


# ==========================================
# Example Usage
# ==========================================

if __name__ == "__main__":
    logger.info("Prophet Forecasting Models - Example Usage")

    # Example: Solar Forecasting
    logger.info("\n" + "="*60)
    logger.info("SOLAR GENERATION FORECASTING WITH PROPHET")
    logger.info("="*60)

    # Create sample solar generation data (hourly, 30 days)
    dates = pd.date_range(start="2025-10-01", end="2025-10-31", freq="H")
    solar_gen = pd.DataFrame({
        "timestamp": dates,
        "generation_mw": 10 * np.sin(np.arange(len(dates)) * 2 * np.pi / 24) + 10 + np.random.randn(len(dates)) * 2,
    })
    solar_gen["generation_mw"] = solar_gen["generation_mw"].clip(lower=0)

    # Sample weather data
    weather = pd.DataFrame({
        "timestamp": dates,
        "irradiation_wh_m2": 500 + 300 * np.sin(np.arange(len(dates)) * 2 * np.pi / 24) + np.random.randn(len(dates)) * 50,
        "temperature_c": 25 + 5 * np.sin(np.arange(len(dates)) * 2 * np.pi / 24) + np.random.randn(len(dates)) * 2,
        "cloud_cover_percent": np.random.randint(0, 100, len(dates)),
    })

    # Fit solar forecaster
    if PROPHET_AVAILABLE:
        solar_forecaster = ProphetSolarForecaster()
        solar_forecaster.fit_solar_model(solar_gen, weather)

        # Generate 48-hour forecast
        forecast = solar_forecaster.forecast_solar(hours_ahead=48)
        logger.info(f"\nSolar Forecast (48 hours ahead):")
        logger.info(f"  Mean: {np.mean(forecast['forecast']):.2f} MW")
        logger.info(f"  Min: {np.min(forecast['forecast']):.2f} MW")
        logger.info(f"  Max: {np.max(forecast['forecast']):.2f} MW")

        logger.info("\n" + "="*60)
        logger.info("Prophet forecasting models ready for integration!")
        logger.info("="*60)
    else:
        logger.error("Prophet library not available. Install with: pip install prophet")
