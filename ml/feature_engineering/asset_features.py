"""
Asset Feature Engineering
Creates features from asset data for predictive maintenance
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional


def calculate_asset_age(created_at: pd.Series) -> pd.Series:
    """
    Calculate asset age in months

    Args:
        created_at: Asset creation timestamp

    Returns:
        Age in months
    """
    now = pd.Timestamp.now()
    age_delta = now - pd.to_datetime(created_at)
    age_months = (age_delta.dt.days / 30.44).astype(int)
    return age_months.clip(lower=0)


def calculate_days_since_last_maintenance(
    completed_at: pd.Series,
    fill_value: int = 999
) -> pd.Series:
    """
    Calculate days since last maintenance

    Args:
        completed_at: Last maintenance completion timestamp
        fill_value: Value to use for assets with no maintenance

    Returns:
        Days since last maintenance
    """
    now = pd.Timestamp.now()
    days_since = (now - pd.to_datetime(completed_at)).dt.days

    # Fill NaN with fill_value (no maintenance history)
    return days_since.fillna(fill_value).astype(int)


def calculate_mttr(
    created_at: pd.Series,
    completed_at: pd.Series,
    work_order_type: pd.Series
) -> float:
    """
    Calculate Mean Time To Repair (MTTR) in hours
    Only considers corrective work orders

    Args:
        created_at: Work order creation timestamp
        completed_at: Work order completion timestamp
        work_order_type: Type of work order

    Returns:
        MTTR in hours
    """
    # Filter corrective work orders
    is_corrective = work_order_type == 'corrective'
    is_completed = completed_at.notna()

    mask = is_corrective & is_completed

    if not mask.any():
        return 0.0

    # Calculate duration
    duration = (
        pd.to_datetime(completed_at[mask]) -
        pd.to_datetime(created_at[mask])
    )

    mttr_hours = duration.dt.total_seconds() / 3600.0
    return mttr_hours.mean()


def calculate_mtbf(
    failure_timestamps: List[pd.Timestamp],
    asset_created_at: pd.Timestamp
) -> float:
    """
    Calculate Mean Time Between Failures (MTBF) in hours

    Args:
        failure_timestamps: List of failure timestamps (sorted)
        asset_created_at: Asset creation timestamp

    Returns:
        MTBF in hours
    """
    if len(failure_timestamps) < 2:
        # Not enough failures to calculate MTBF
        return 0.0

    # Calculate time between consecutive failures
    failure_timestamps_sorted = sorted(failure_timestamps)
    intervals = [
        (failure_timestamps_sorted[i+1] - failure_timestamps_sorted[i]).total_seconds() / 3600.0
        for i in range(len(failure_timestamps_sorted) - 1)
    ]

    return np.mean(intervals) if intervals else 0.0


def calculate_work_order_rate(
    total_work_orders: int,
    asset_age_months: int
) -> float:
    """
    Calculate work order rate (WOs per month)

    Args:
        total_work_orders: Total number of work orders
        asset_age_months: Asset age in months

    Returns:
        Work orders per month
    """
    if asset_age_months == 0:
        return 0.0

    return total_work_orders / asset_age_months


def calculate_corrective_wo_ratio(
    corrective_wo_count: int,
    total_wo_count: int
) -> float:
    """
    Calculate ratio of corrective work orders to total

    Args:
        corrective_wo_count: Number of corrective work orders
        total_wo_count: Total number of work orders

    Returns:
        Ratio (0.0 to 1.0)
    """
    if total_wo_count == 0:
        return 0.0

    return corrective_wo_count / total_wo_count


def calculate_maintenance_health_ratio(
    days_since_last_maintenance: int,
    health_score: float
) -> float:
    """
    Calculate ratio of days since maintenance to health score
    Higher values indicate overdue maintenance for deteriorating assets

    Args:
        days_since_last_maintenance: Days since last maintenance
        health_score: Asset health score (0-100)

    Returns:
        Maintenance health ratio
    """
    if health_score == 0:
        return float('inf')

    return days_since_last_maintenance / health_score


def create_asset_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create all asset features for ML model

    Args:
        df: DataFrame with asset and work order data

    Required columns:
        - asset_id
        - created_at (asset)
        - total_work_orders
        - corrective_work_orders
        - preventive_work_orders
        - health_score
        - recent_alarms_30d
        - last_maintenance_date (optional)

    Returns:
        DataFrame with engineered features
    """
    features = df.copy()

    # Age features
    features['asset_age_months'] = calculate_asset_age(features['created_at'])

    # Maintenance features
    if 'last_maintenance_date' in features.columns:
        features['days_since_last_maintenance'] = calculate_days_since_last_maintenance(
            features['last_maintenance_date']
        )
    else:
        features['days_since_last_maintenance'] = 999

    # Work order rate features
    features['wo_rate_per_month'] = features.apply(
        lambda row: calculate_work_order_rate(
            row['total_work_orders'],
            row['asset_age_months']
        ),
        axis=1
    )

    # Corrective WO ratio
    features['corrective_wo_ratio'] = features.apply(
        lambda row: calculate_corrective_wo_ratio(
            row['corrective_work_orders'],
            row['total_work_orders']
        ),
        axis=1
    )

    # Maintenance health ratio
    features['maintenance_health_ratio'] = features.apply(
        lambda row: calculate_maintenance_health_ratio(
            row['days_since_last_maintenance'],
            row['health_score']
        ),
        axis=1
    )

    # Alarm rate features
    features['alarm_rate_30d'] = features['recent_alarms_30d'] / 30.0

    # Binary flags
    features['has_recent_maintenance'] = (features['days_since_last_maintenance'] < 30).astype(int)
    features['is_overdue_maintenance'] = (features['days_since_last_maintenance'] > 180).astype(int)
    features['has_low_health'] = (features['health_score'] < 50).astype(int)
    features['has_high_alarms'] = (features['recent_alarms_30d'] > 10).astype(int)

    return features


def get_feature_names() -> List[str]:
    """Get list of engineered feature names"""
    return [
        'asset_age_months',
        'days_since_last_maintenance',
        'wo_rate_per_month',
        'corrective_wo_ratio',
        'maintenance_health_ratio',
        'alarm_rate_30d',
        'has_recent_maintenance',
        'is_overdue_maintenance',
        'has_low_health',
        'has_high_alarms',
    ]


def get_feature_metadata() -> Dict[str, Dict]:
    """Get metadata about features"""
    return {
        'asset_age_months': {
            'type': 'numeric',
            'description': 'Age of asset in months',
            'min': 0,
            'max': None,
        },
        'days_since_last_maintenance': {
            'type': 'numeric',
            'description': 'Days since last maintenance (999 if never)',
            'min': 0,
            'max': 999,
        },
        'wo_rate_per_month': {
            'type': 'numeric',
            'description': 'Average work orders per month',
            'min': 0,
            'max': None,
        },
        'corrective_wo_ratio': {
            'type': 'numeric',
            'description': 'Ratio of corrective to total work orders',
            'min': 0,
            'max': 1,
        },
        'maintenance_health_ratio': {
            'type': 'numeric',
            'description': 'Days since maintenance divided by health score',
            'min': 0,
            'max': None,
        },
        'alarm_rate_30d': {
            'type': 'numeric',
            'description': 'Average alarms per day (last 30 days)',
            'min': 0,
            'max': None,
        },
        'has_recent_maintenance': {
            'type': 'binary',
            'description': 'Had maintenance in last 30 days',
            'values': [0, 1],
        },
        'is_overdue_maintenance': {
            'type': 'binary',
            'description': 'No maintenance in last 180 days',
            'values': [0, 1],
        },
        'has_low_health': {
            'type': 'binary',
            'description': 'Health score below 50',
            'values': [0, 1],
        },
        'has_high_alarms': {
            'type': 'binary',
            'description': 'More than 10 alarms in last 30 days',
            'values': [0, 1],
        },
    }
