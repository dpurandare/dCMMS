"""
Telemetry Feature Engineering
Creates rolling aggregates and statistical features from telemetry data
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional


def calculate_rolling_stats(
    series: pd.Series,
    window: int,
    stats: List[str] = ['mean', 'std', 'min', 'max']
) -> Dict[str, pd.Series]:
    """
    Calculate rolling window statistics

    Args:
        series: Time series data
        window: Rolling window size (number of periods)
        stats: List of statistics to calculate

    Returns:
        Dictionary of stat_name -> Series
    """
    result = {}

    for stat in stats:
        if stat == 'mean':
            result[f'rolling_{stat}_{window}'] = series.rolling(window).mean()
        elif stat == 'std':
            result[f'rolling_{stat}_{window}'] = series.rolling(window).std()
        elif stat == 'min':
            result[f'rolling_{stat}_{window}'] = series.rolling(window).min()
        elif stat == 'max':
            result[f'rolling_{stat}_{window}'] = series.rolling(window).max()
        elif stat == 'median':
            result[f'rolling_{stat}_{window}'] = series.rolling(window).median()
        elif stat == 'q25':
            result[f'rolling_{stat}_{window}'] = series.rolling(window).quantile(0.25)
        elif stat == 'q75':
            result[f'rolling_{stat}_{window}'] = series.rolling(window).quantile(0.75)

    return result


def detect_anomalies_zscore(
    series: pd.Series,
    threshold: float = 3.0,
    window: int = 30
) -> pd.Series:
    """
    Detect anomalies using z-score method

    Args:
        series: Time series data
        threshold: Z-score threshold (default 3.0 = 3 standard deviations)
        window: Rolling window for calculating statistics

    Returns:
        Boolean series indicating anomalies
    """
    rolling_mean = series.rolling(window).mean()
    rolling_std = series.rolling(window).std()

    z_score = np.abs((series - rolling_mean) / rolling_std)

    return z_score > threshold


def detect_anomalies_iqr(
    series: pd.Series,
    multiplier: float = 1.5,
    window: int = 30
) -> pd.Series:
    """
    Detect anomalies using IQR method

    Args:
        series: Time series data
        multiplier: IQR multiplier (default 1.5 for outliers)
        window: Rolling window for calculating quartiles

    Returns:
        Boolean series indicating anomalies
    """
    rolling_q25 = series.rolling(window).quantile(0.25)
    rolling_q75 = series.rolling(window).quantile(0.75)
    rolling_iqr = rolling_q75 - rolling_q25

    lower_bound = rolling_q25 - multiplier * rolling_iqr
    upper_bound = rolling_q75 + multiplier * rolling_iqr

    return (series < lower_bound) | (series > upper_bound)


def calculate_capacity_factor(
    actual_power: pd.Series,
    rated_capacity: float,
    window: int = 7
) -> pd.Series:
    """
    Calculate capacity factor (actual / rated capacity)

    Args:
        actual_power: Actual power output
        rated_capacity: Rated capacity of asset
        window: Rolling window in days

    Returns:
        Capacity factor (0.0 to 1.0+)
    """
    if rated_capacity == 0:
        return pd.Series(0.0, index=actual_power.index)

    rolling_avg = actual_power.rolling(window * 24).mean()  # Assuming hourly data
    return (rolling_avg / rated_capacity).clip(lower=0.0, upper=1.5)


def calculate_availability(
    uptime_series: pd.Series,
    window: int = 7
) -> pd.Series:
    """
    Calculate availability (percentage of uptime)

    Args:
        uptime_series: Binary series (1 = up, 0 = down)
        window: Rolling window in days

    Returns:
        Availability percentage (0.0 to 1.0)
    """
    rolling_availability = uptime_series.rolling(window * 24).mean()
    return rolling_availability


def calculate_trend(series: pd.Series, window: int = 7) -> pd.Series:
    """
    Calculate trend using linear regression slope

    Args:
        series: Time series data
        window: Rolling window size

    Returns:
        Slope of linear trend
    """
    def rolling_slope(window_data):
        if len(window_data) < 2:
            return 0.0

        x = np.arange(len(window_data))
        y = window_data.values

        # Simple linear regression
        x_mean = x.mean()
        y_mean = y.mean()

        numerator = ((x - x_mean) * (y - y_mean)).sum()
        denominator = ((x - x_mean) ** 2).sum()

        if denominator == 0:
            return 0.0

        slope = numerator / denominator
        return slope

    return series.rolling(window).apply(rolling_slope, raw=False)


def create_telemetry_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create telemetry features for ML model

    Args:
        df: DataFrame with telemetry data (time-indexed)

    Required columns:
        - asset_id
        - timestamp
        - power_kw
        - voltage_v
        - current_a
        - temperature_c
        - frequency_hz (optional)

    Returns:
        DataFrame with engineered features
    """
    features = df.copy()

    # Ensure timestamp index
    if 'timestamp' in features.columns and not isinstance(features.index, pd.DatetimeIndex):
        features = features.set_index('timestamp')

    # Power features (7-day rolling)
    power_stats = calculate_rolling_stats(features['power_kw'], window=7*24)
    for name, series in power_stats.items():
        features[f'power_{name}'] = series

    # Voltage features (7-day rolling)
    voltage_stats = calculate_rolling_stats(features['voltage_v'], window=7*24, stats=['mean', 'std'])
    for name, series in voltage_stats.items():
        features[f'voltage_{name}'] = series

    # Temperature features
    temp_stats = calculate_rolling_stats(features['temperature_c'], window=7*24, stats=['mean', 'std', 'max'])
    for name, series in temp_stats.items():
        features[f'temperature_{name}'] = series

    # Anomaly detection
    features['power_anomaly'] = detect_anomalies_zscore(features['power_kw']).astype(int)
    features['voltage_anomaly'] = detect_anomalies_zscore(features['voltage_v']).astype(int)
    features['temperature_anomaly'] = detect_anomalies_zscore(features['temperature_c']).astype(int)

    # Anomaly counts (rolling 7 days)
    features['anomaly_count_7d'] = (
        features[['power_anomaly', 'voltage_anomaly', 'temperature_anomaly']]
        .sum(axis=1)
        .rolling(7*24)
        .sum()
    )

    # Capacity factor (if rated capacity available)
    if 'rated_capacity_kw' in features.columns:
        features['capacity_factor_7d'] = calculate_capacity_factor(
            features['power_kw'],
            features['rated_capacity_kw'].iloc[0],
            window=7
        )

    # Trends
    features['power_trend_7d'] = calculate_trend(features['power_kw'], window=7*24)
    features['temperature_trend_7d'] = calculate_trend(features['temperature_c'], window=7*24)

    # Volatility (coefficient of variation)
    features['power_cv_7d'] = (
        features['power_rolling_std_168'] / features['power_rolling_mean_168']
    ).fillna(0)

    return features


def get_telemetry_feature_names() -> List[str]:
    """Get list of telemetry feature names"""
    return [
        'power_rolling_mean_168',
        'power_rolling_std_168',
        'power_rolling_min_168',
        'power_rolling_max_168',
        'voltage_rolling_mean_168',
        'voltage_rolling_std_168',
        'temperature_rolling_mean_168',
        'temperature_rolling_std_168',
        'temperature_rolling_max_168',
        'power_anomaly',
        'voltage_anomaly',
        'temperature_anomaly',
        'anomaly_count_7d',
        'capacity_factor_7d',
        'power_trend_7d',
        'temperature_trend_7d',
        'power_cv_7d',
    ]
