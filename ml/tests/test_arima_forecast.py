import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.arima_forecast import SolarGenerationForecaster, WindGenerationForecaster

class TestSolarGenerationForecaster:
    @pytest.fixture
    def forecaster(self):
        return SolarGenerationForecaster()

    @pytest.fixture
    def mock_data(self):
        dates = pd.date_range(start="2025-01-01", periods=100, freq="H")
        generation = pd.DataFrame({
            "timestamp": dates,
            "generation_mw": np.random.rand(100) * 10
        })
        weather = pd.DataFrame({
            "timestamp": dates,
            "irradiation_wh_m2": np.random.rand(100) * 1000,
            "temperature_c": np.random.rand(100) * 30,
            "cloud_cover_percent": np.random.rand(100) * 100
        })
        return generation, weather

    def test_initialization(self, forecaster):
        assert forecaster.model_name == "arima_solar"
        assert forecaster.algorithm == "SARIMA"
        assert forecaster.seasonal_period == 24

    def test_prepare_data(self, forecaster, mock_data):
        gen, weather = mock_data
        df = forecaster.prepare_data(gen, weather)
        
        assert len(df) == 100
        assert "generation_mw" in df.columns
        assert "irradiation_wh_m2" in df.columns
        assert isinstance(df.index, pd.DatetimeIndex)

    @patch("models.arima_forecast.SARIMAX")
    def test_fit_solar_model(self, mock_sarimax, forecaster, mock_data):
        gen, weather = mock_data
        
        # Mock the fit method of SARIMAX instance
        mock_model_instance = MagicMock()
        mock_sarimax.return_value = mock_model_instance
        mock_model_instance.fit.return_value = MagicMock()

        forecaster.fit_solar_model(gen, weather)
        
        assert forecaster.model is not None
        assert forecaster.model_fit is not None
        assert forecaster.training_data_end_date == gen["timestamp"].max()

    def test_forecast_without_fit_raises_error(self, forecaster):
        with pytest.raises(ValueError, match="Model not fitted"):
            forecaster.forecast_solar(hours_ahead=24)

class TestWindGenerationForecaster:
    @pytest.fixture
    def forecaster(self):
        return WindGenerationForecaster()

    def test_initialization(self, forecaster):
        assert forecaster.model_name == "sarima_wind"
        assert forecaster.seasonal_period == 96  # 24 hours * 4 quarters

    @patch("models.arima_forecast.SARIMAX")
    def test_fit_wind_model(self, mock_sarimax, forecaster):
        dates = pd.date_range(start="2025-01-01", periods=200, freq="15min")
        gen = pd.DataFrame({
            "timestamp": dates,
            "generation_mw": np.random.rand(200) * 5
        })
        weather = pd.DataFrame({
            "timestamp": dates,
            "wind_speed_ms": np.random.rand(200) * 15,
            "wind_direction_deg": np.random.rand(200) * 360,
            "air_density_kg_m3": np.random.rand(200) * 1.2
        })

        # Mock SARIMAX
        mock_model_instance = MagicMock()
        mock_sarimax.return_value = mock_model_instance
        mock_model_instance.fit.return_value = MagicMock()

        forecaster.fit_wind_model(gen, weather)
        
        assert forecaster.model is not None
        assert forecaster.training_data_end_date == dates.max()
