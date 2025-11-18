#!/usr/bin/env python3
"""
Advanced Feature Engineering for Predictive Maintenance

Creates advanced time-series and domain-specific features.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from sklearn.linear_model import LinearRegression


def create_lag_features(
    df: pd.DataFrame,
    columns: List[str],
    lags: List[int],
    group_by: Optional[str] = 'asset_id'
) -> pd.DataFrame:
    """
    Create lag features for time series data

    Args:
        df: Input DataFrame with time series data
        columns: Columns to create lags for (e.g., ['power_kw', 'temperature_c'])
        lags: List of lag periods in days (e.g., [1, 7, 30])
        group_by: Column to group by (typically 'asset_id')

    Returns:
        DataFrame with lag features added
    """
    result = df.copy()

    for col in columns:
        for lag in lags:
            lag_col_name = f"{col}_lag_{lag}d"

            if group_by:
                result[lag_col_name] = result.groupby(group_by)[col].shift(lag)
            else:
                result[lag_col_name] = result[col].shift(lag)

    return result


def create_rolling_window_features(
    df: pd.DataFrame,
    columns: List[str],
    windows: List[int],
    statistics: List[str] = ['mean', 'std', 'min', 'max', 'median'],
    group_by: Optional[str] = 'asset_id'
) -> pd.DataFrame:
    """
    Create rolling window statistical features

    Args:
        df: Input DataFrame
        columns: Columns to compute rolling stats for
        windows: Window sizes in days (e.g., [7, 14, 30])
        statistics: Statistics to compute (mean, std, min, max, median, etc.)
        group_by: Column to group by

    Returns:
        DataFrame with rolling features added
    """
    result = df.copy()

    for col in columns:
        for window in windows:
            for stat in statistics:
                feature_name = f"{col}_rolling_{stat}_{window}d"

                if group_by:
                    # Group by asset and compute rolling stat
                    grouped = result.groupby(group_by)[col]

                    if stat == 'mean':
                        result[feature_name] = grouped.transform(
                            lambda x: x.rolling(window=window, min_periods=1).mean()
                        )
                    elif stat == 'std':
                        result[feature_name] = grouped.transform(
                            lambda x: x.rolling(window=window, min_periods=1).std()
                        )
                    elif stat == 'min':
                        result[feature_name] = grouped.transform(
                            lambda x: x.rolling(window=window, min_periods=1).min()
                        )
                    elif stat == 'max':
                        result[feature_name] = grouped.transform(
                            lambda x: x.rolling(window=window, min_periods=1).max()
                        )
                    elif stat == 'median':
                        result[feature_name] = grouped.transform(
                            lambda x: x.rolling(window=window, min_periods=1).median()
                        )
                    elif stat == 'quantile_25':
                        result[feature_name] = grouped.transform(
                            lambda x: x.rolling(window=window, min_periods=1).quantile(0.25)
                        )
                    elif stat == 'quantile_75':
                        result[feature_name] = grouped.transform(
                            lambda x: x.rolling(window=window, min_periods=1).quantile(0.75)
                        )
                else:
                    # No grouping
                    if stat == 'mean':
                        result[feature_name] = result[col].rolling(window=window, min_periods=1).mean()
                    # ... similar for other stats

    return result


def create_trend_features(
    df: pd.DataFrame,
    columns: List[str],
    windows: List[int] = [7, 14, 30],
    group_by: Optional[str] = 'asset_id'
) -> pd.DataFrame:
    """
    Create trend features (linear regression slope over rolling window)

    Args:
        df: Input DataFrame
        columns: Columns to compute trends for
        windows: Window sizes in days
        group_by: Column to group by

    Returns:
        DataFrame with trend features added
    """
    result = df.copy()

    for col in columns:
        for window in windows:
            trend_col_name = f"{col}_trend_{window}d"

            def calculate_slope(series):
                """Calculate linear regression slope"""
                if len(series) < 2:
                    return 0.0

                # Remove NaN values
                valid = series.dropna()
                if len(valid) < 2:
                    return 0.0

                X = np.arange(len(valid)).reshape(-1, 1)
                y = valid.values

                try:
                    model = LinearRegression()
                    model.fit(X, y)
                    return model.coef_[0]
                except:
                    return 0.0

            if group_by:
                result[trend_col_name] = result.groupby(group_by)[col].transform(
                    lambda x: x.rolling(window=window, min_periods=2).apply(calculate_slope, raw=False)
                )
            else:
                result[trend_col_name] = result[col].rolling(window=window, min_periods=2).apply(
                    calculate_slope, raw=False
                )

    return result


def create_capacity_factor_feature(
    df: pd.DataFrame,
    actual_power_col: str = 'power_kw',
    rated_capacity_col: str = 'installed_capacity_kw',
    window: int = 30
) -> pd.Series:
    """
    Calculate capacity factor (actual production / rated capacity)

    Args:
        df: Input DataFrame
        actual_power_col: Column with actual power generation
        rated_capacity_col: Column with rated capacity
        window: Rolling window for averaging (days)

    Returns:
        Series with capacity factor
    """
    # Average actual power over window
    avg_actual = df[actual_power_col].rolling(window=window, min_periods=1).mean()

    # Capacity factor = actual / rated
    capacity_factor = avg_actual / df[rated_capacity_col]

    # Cap at 1.0 (100%)
    capacity_factor = capacity_factor.clip(upper=1.0)

    return capacity_factor.fillna(0)


def create_degradation_rate_feature(
    df: pd.DataFrame,
    power_col: str = 'power_kw',
    lookback_days: int = 365,
    group_by: str = 'asset_id'
) -> pd.Series:
    """
    Calculate degradation rate: (production_today - production_1yr_ago) / production_1yr_ago

    Args:
        df: Input DataFrame
        power_col: Column with power data
        lookback_days: Days to look back (365 for 1 year)
        group_by: Column to group by

    Returns:
        Series with degradation rate
    """
    # Current power (7-day average to smooth)
    current_power = df.groupby(group_by)[power_col].transform(
        lambda x: x.rolling(window=7, min_periods=1).mean()
    )

    # Power from lookback_days ago
    past_power = df.groupby(group_by)[power_col].shift(lookback_days)

    # Degradation rate
    degradation_rate = (current_power - past_power) / (past_power + 1e-6)  # Avoid division by zero

    return degradation_rate.fillna(0)


def create_alarm_frequency_feature(
    df: pd.DataFrame,
    alarm_count_col: str = 'recent_alarms_30d',
    window_days: int = 30
) -> pd.Series:
    """
    Calculate alarm frequency: alarms per day

    Args:
        df: Input DataFrame
        alarm_count_col: Column with alarm counts
        window_days: Window size in days

    Returns:
        Series with alarm frequency (alarms/day)
    """
    alarm_frequency = df[alarm_count_col] / window_days
    return alarm_frequency.fillna(0)


def create_feature_interactions(
    df: pd.DataFrame,
    interaction_pairs: List[Tuple[str, str]]
) -> pd.DataFrame:
    """
    Create feature interactions (multiplicative)

    Args:
        df: Input DataFrame
        interaction_pairs: List of (feature1, feature2) tuples to interact

    Returns:
        DataFrame with interaction features added

    Example:
        interaction_pairs = [
            ('asset_age_months', 'alarm_frequency'),
            ('mttr_hours', 'recent_wo_count'),
        ]
    """
    result = df.copy()

    for feat1, feat2 in interaction_pairs:
        if feat1 in result.columns and feat2 in result.columns:
            interaction_name = f"{feat1}_x_{feat2}"
            result[interaction_name] = result[feat1] * result[feat2]

    return result


def create_ratio_features(
    df: pd.DataFrame,
    ratio_pairs: List[Tuple[str, str]]
) -> pd.DataFrame:
    """
    Create ratio features (division)

    Args:
        df: Input DataFrame
        ratio_pairs: List of (numerator, denominator) tuples

    Returns:
        DataFrame with ratio features added

    Example:
        ratio_pairs = [
            ('corrective_wo_count', 'total_wo_count'),
            ('power_kw', 'rated_capacity_kw'),
        ]
    """
    result = df.copy()

    for numerator, denominator in ratio_pairs:
        if numerator in result.columns and denominator in result.columns:
            ratio_name = f"{numerator}_div_{denominator}"
            result[ratio_name] = result[numerator] / (result[denominator] + 1e-6)  # Avoid division by zero

    return result


def create_advanced_features(
    df: pd.DataFrame,
    telemetry_cols: List[str] = ['power_kw', 'voltage_v', 'temperature_c'],
    lag_windows: List[int] = [1, 7, 30],
    rolling_windows: List[int] = [7, 14, 30],
    trend_windows: List[int] = [7, 14, 30],
    include_interactions: bool = True
) -> pd.DataFrame:
    """
    Create all advanced features for predictive maintenance

    Args:
        df: Input DataFrame (must have asset_id, timestamp, telemetry columns)
        telemetry_cols: Telemetry columns to engineer features from
        lag_windows: Lag periods in days
        rolling_windows: Rolling window sizes in days
        trend_windows: Trend window sizes in days
        include_interactions: Whether to include feature interactions

    Returns:
        DataFrame with all advanced features
    """
    print("Creating advanced features...")

    result = df.copy()

    # Sort by asset_id and timestamp
    if 'asset_id' in result.columns and 'timestamp' in result.columns:
        result = result.sort_values(['asset_id', 'timestamp'])

    # 1. Lag features
    print("  - Lag features...")
    result = create_lag_features(result, telemetry_cols, lag_windows)

    # 2. Rolling window features
    print("  - Rolling window features...")
    result = create_rolling_window_features(
        result,
        telemetry_cols,
        rolling_windows,
        statistics=['mean', 'std', 'min', 'max']
    )

    # 3. Trend features
    print("  - Trend features...")
    result = create_trend_features(result, telemetry_cols, trend_windows)

    # 4. Domain-specific features
    print("  - Domain-specific features...")

    # Capacity factor (if columns exist)
    if 'power_kw' in result.columns and 'installed_capacity_kw' in result.columns:
        result['capacity_factor_30d'] = create_capacity_factor_feature(
            result,
            window=30
        )

    # Degradation rate
    if 'power_kw' in result.columns:
        result['degradation_rate_365d'] = create_degradation_rate_feature(result)

    # Alarm frequency
    if 'recent_alarms_30d' in result.columns:
        result['alarm_frequency'] = create_alarm_frequency_feature(result)

    # 5. Feature interactions
    if include_interactions:
        print("  - Feature interactions...")
        interaction_pairs = [
            ('asset_age_months', 'alarm_frequency'),
            ('mttr_hours', 'wo_rate_per_month'),
            ('health_score', 'days_since_last_maintenance'),
        ]
        # Only include pairs where both features exist
        valid_pairs = [
            (f1, f2) for f1, f2 in interaction_pairs
            if f1 in result.columns and f2 in result.columns
        ]
        if valid_pairs:
            result = create_feature_interactions(result, valid_pairs)

    print(f"  ✓ Created {len(result.columns) - len(df.columns)} new features")

    return result


def select_important_features(
    X: pd.DataFrame,
    y: pd.Series,
    model,
    importance_threshold: float = 0.01
) -> List[str]:
    """
    Select features based on model importance

    Args:
        X: Feature matrix
        y: Target variable
        model: Trained model with feature_importances_ attribute
        importance_threshold: Minimum importance (0.01 = 1%)

    Returns:
        List of important feature names
    """
    # Train model if not already trained
    if not hasattr(model, 'feature_importances_'):
        model.fit(X, y)

    # Get feature importances
    importances = model.feature_importances_
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': importances
    }).sort_values('importance', ascending=False)

    # Filter by threshold
    important_features = feature_importance[
        feature_importance['importance'] >= importance_threshold
    ]['feature'].tolist()

    print(f"Selected {len(important_features)}/{len(X.columns)} features (importance >= {importance_threshold})")

    return important_features


# Feature metadata for documentation
ADVANCED_FEATURE_METADATA = {
    # Lag features
    'power_kw_lag_1d': {
        'description': 'Power generation 1 day ago',
        'type': 'numeric',
        'unit': 'kW',
    },
    'power_kw_lag_7d': {
        'description': 'Power generation 7 days ago',
        'type': 'numeric',
        'unit': 'kW',
    },

    # Rolling features
    'power_kw_rolling_mean_7d': {
        'description': '7-day rolling average power',
        'type': 'numeric',
        'unit': 'kW',
    },
    'power_kw_rolling_std_7d': {
        'description': '7-day rolling standard deviation of power',
        'type': 'numeric',
        'unit': 'kW',
    },
    'temperature_c_rolling_max_14d': {
        'description': '14-day rolling maximum temperature',
        'type': 'numeric',
        'unit': '°C',
    },

    # Trend features
    'power_kw_trend_7d': {
        'description': '7-day power trend (linear regression slope)',
        'type': 'numeric',
        'unit': 'kW/day',
    },
    'temperature_c_trend_14d': {
        'description': '14-day temperature trend',
        'type': 'numeric',
        'unit': '°C/day',
    },

    # Domain-specific
    'capacity_factor_30d': {
        'description': '30-day capacity factor (actual/rated)',
        'type': 'numeric',
        'range': [0, 1],
    },
    'degradation_rate_365d': {
        'description': 'Year-over-year degradation rate',
        'type': 'numeric',
        'range': [-1, 1],
    },
    'alarm_frequency': {
        'description': 'Alarms per day (30-day window)',
        'type': 'numeric',
        'unit': 'alarms/day',
    },

    # Interactions
    'asset_age_months_x_alarm_frequency': {
        'description': 'Interaction: asset age × alarm frequency',
        'type': 'numeric',
    },
    'mttr_hours_x_wo_rate_per_month': {
        'description': 'Interaction: MTTR × work order rate',
        'type': 'numeric',
    },
}


if __name__ == '__main__':
    """Example usage"""
    import pandas as pd

    # Create sample data
    np.random.seed(42)

    dates = pd.date_range('2024-01-01', '2024-12-31', freq='D')
    n_assets = 5
    n_days = len(dates)

    data = []
    for asset_id in range(1, n_assets + 1):
        for i, date in enumerate(dates):
            data.append({
                'asset_id': f'asset_{asset_id}',
                'timestamp': date,
                'power_kw': 100 + np.random.randn() * 10 - (i / 100),  # Slight degradation
                'voltage_v': 400 + np.random.randn() * 5,
                'temperature_c': 25 + np.random.randn() * 3,
                'installed_capacity_kw': 100,
                'asset_age_months': 24 + (i // 30),
                'recent_alarms_30d': max(0, int(np.random.randn() * 2 + 3)),
                'mttr_hours': max(1, np.random.randn() * 5 + 10),
                'wo_rate_per_month': max(0, np.random.randn() * 0.5 + 1),
                'health_score': max(0, min(100, 70 + np.random.randn() * 10)),
                'days_since_last_maintenance': min(180, i % 90),
            })

    df = pd.DataFrame(data)

    # Create advanced features
    result = create_advanced_features(
        df,
        telemetry_cols=['power_kw', 'voltage_v', 'temperature_c'],
        lag_windows=[1, 7],
        rolling_windows=[7, 14],
        trend_windows=[7, 14],
    )

    print("\nCreated features:")
    print(result.columns.tolist())
    print(f"\nTotal features: {len(result.columns)}")
    print(f"\nSample data:")
    print(result.head())
