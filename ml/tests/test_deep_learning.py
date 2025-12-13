import pytest
import torch
import numpy as np
import pandas as pd
from models.lstm_forecast import SolarLSTMForecaster
from models.transformer_forecast import SolarTransformerForecaster

def create_dummy_data(length=500):
    timestamps = pd.date_range(start='2024-01-01', periods=length, freq='H')
    # Generate simple sine wave
    values = np.sin(np.linspace(0, 100, length)) * 50 + 50
    return pd.DataFrame({'timestamp': timestamps, 'generation_mw': values})

def test_lstm_initialization():
    model = SolarLSTMForecaster()
    assert model.model is None
    assert model.lookback_hours == 168

def test_lstm_training_step():
    df = create_dummy_data(300) # Enough for lookback + horizon
    forecaster = SolarLSTMForecaster(lookback_hours=24, forecast_horizon=12)
    
    # Train for 1 epoch just to check pipeline
    forecaster.train(df, epochs=1, batch_size=4)
    assert forecaster.model is not None
    
    # Test prediction
    recent_history = df['generation_mw'].values[-24:]
    prediction = forecaster.predict(recent_history)
    
    assert len(prediction) == 12
    assert not np.isnan(prediction).any()

def test_transformer_training_step():
    df = create_dummy_data(300)
    forecaster = SolarTransformerForecaster(lookback_hours=24, forecast_horizon=12)
    
    forecaster.train(df, epochs=1, batch_size=4)
    assert forecaster.model is not None
    
    recent_history = df['generation_mw'].values[-24:]
    prediction = forecaster.predict(recent_history)
    
    assert len(prediction) == 12
    assert not np.isnan(prediction).any()
