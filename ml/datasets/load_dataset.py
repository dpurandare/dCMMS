#!/usr/bin/env python3
"""
Utility functions for loading training datasets
"""

import json
from pathlib import Path
from typing import Tuple, Dict

import pandas as pd


def load_dataset(
    dataset_version: str = 'v1.0',
    dataset_dir: str = '/tmp/dcmms/datasets'
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, Dict]:
    """
    Load training dataset from Parquet files

    Args:
        dataset_version: Dataset version to load
        dataset_dir: Root directory containing datasets

    Returns:
        X_train, X_test, y_train, y_test, metadata
    """
    version_dir = Path(dataset_dir) / dataset_version

    if not version_dir.exists():
        raise FileNotFoundError(f"Dataset version {dataset_version} not found in {dataset_dir}")

    # Load train set
    train_df = pd.read_parquet(version_dir / 'train.parquet')
    X_train = train_df.drop(columns=['target'])
    y_train = train_df['target']

    # Load test set
    test_df = pd.read_parquet(version_dir / 'test.parquet')
    X_test = test_df.drop(columns=['target'])
    y_test = test_df['target']

    # Load metadata
    with open(version_dir / 'metadata.json', 'r') as f:
        metadata = json.load(f)

    return X_train, X_test, y_train, y_test, metadata


def print_dataset_info(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    metadata: Dict
):
    """Print dataset information"""
    print("=" * 60)
    print("Dataset Information")
    print("=" * 60)
    print(f"Version: {metadata.get('dataset_version', 'unknown')}")
    print(f"Created: {metadata.get('created_at', 'unknown')}")
    print()

    print("Dataset Statistics:")
    print(f"  Train samples: {len(X_train)}")
    print(f"  Test samples: {len(X_test)}")
    print(f"  Features: {len(X_train.columns)}")
    print(f"  Train positive rate: {y_train.mean():.2%}")
    print(f"  Test positive rate: {y_test.mean():.2%}")
    print()

    print("Feature List:")
    for i, col in enumerate(X_train.columns, 1):
        print(f"  {i:2d}. {col}")
    print()

    print("Missing Values:")
    missing = X_train.isnull().sum()
    if missing.sum() > 0:
        print(missing[missing > 0])
    else:
        print("  No missing values")
    print()


def get_feature_names(
    dataset_version: str = 'v1.0',
    dataset_dir: str = '/tmp/dcmms/datasets'
) -> list:
    """
    Get list of feature names

    Args:
        dataset_version: Dataset version
        dataset_dir: Root directory containing datasets

    Returns:
        List of feature names
    """
    version_dir = Path(dataset_dir) / dataset_version
    feature_names_path = version_dir / 'feature_names.txt'

    if not feature_names_path.exists():
        raise FileNotFoundError(f"Feature names file not found: {feature_names_path}")

    with open(feature_names_path, 'r') as f:
        return [line.strip() for line in f if line.strip()]


def list_available_datasets(dataset_dir: str = '/tmp/dcmms/datasets') -> list:
    """
    List available dataset versions

    Args:
        dataset_dir: Root directory containing datasets

    Returns:
        List of dataset versions
    """
    dataset_path = Path(dataset_dir)

    if not dataset_path.exists():
        return []

    versions = []
    for item in dataset_path.iterdir():
        if item.is_dir() and (item / 'train.parquet').exists():
            versions.append(item.name)

    return sorted(versions)


def main():
    """Example usage"""
    import sys

    # List available datasets
    available = list_available_datasets()
    print("Available Datasets:")
    for version in available:
        print(f"  - {version}")
    print()

    if not available:
        print("No datasets found. Create one with: python create_training_dataset.py")
        sys.exit(1)

    # Load latest dataset
    latest_version = available[-1]
    print(f"Loading dataset: {latest_version}")
    print()

    X_train, X_test, y_train, y_test, metadata = load_dataset(latest_version)

    # Print info
    print_dataset_info(X_train, X_test, y_train, y_test, metadata)

    # Print sample
    print("Sample Features (first 5 rows):")
    print(X_train.head())
    print()


if __name__ == '__main__':
    main()
