"""
Data Quality Checks for Feature Engineering
Validates data quality and detects issues
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class DataQualityReport:
    """Data quality report"""
    passed: bool
    total_checks: int
    passed_checks: int
    failed_checks: int
    issues: List[Dict]
    warnings: List[Dict]
    statistics: Dict


def check_missing_values(
    df: pd.DataFrame,
    max_missing_rate: float = 0.1
) -> Tuple[bool, Dict]:
    """
    Check for missing values

    Args:
        df: DataFrame to check
        max_missing_rate: Maximum allowed missing rate (0.0 to 1.0)

    Returns:
        (passed, details_dict)
    """
    missing_counts = df.isnull().sum()
    missing_rates = missing_counts / len(df)

    columns_with_issues = missing_rates[missing_rates > max_missing_rate]

    passed = len(columns_with_issues) == 0

    details = {
        'check': 'missing_values',
        'passed': passed,
        'threshold': max_missing_rate,
        'total_missing': int(missing_counts.sum()),
        'missing_by_column': missing_rates.to_dict(),
        'columns_exceeding_threshold': list(columns_with_issues.index),
    }

    return passed, details


def check_outliers(
    df: pd.DataFrame,
    columns: List[str],
    method: str = 'iqr',
    threshold: float = 3.0
) -> Tuple[bool, Dict]:
    """
    Check for outliers using IQR or z-score method

    Args:
        df: DataFrame to check
        columns: Columns to check for outliers
        method: 'iqr' or 'zscore'
        threshold: Threshold for outlier detection

    Returns:
        (passed, details_dict)
    """
    outlier_counts = {}

    for col in columns:
        if col not in df.columns:
            continue

        if method == 'iqr':
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - threshold * IQR
            upper = Q3 + threshold * IQR
            outliers = (df[col] < lower) | (df[col] > upper)
        else:  # zscore
            mean = df[col].mean()
            std = df[col].std()
            z_scores = np.abs((df[col] - mean) / std)
            outliers = z_scores > threshold

        outlier_counts[col] = int(outliers.sum())

    total_outliers = sum(outlier_counts.values())
    outlier_rate = total_outliers / (len(df) * len(columns))

    passed = outlier_rate < 0.05  # Less than 5% outliers

    details = {
        'check': 'outliers',
        'passed': passed,
        'method': method,
        'threshold': threshold,
        'total_outliers': total_outliers,
        'outlier_rate': outlier_rate,
        'outliers_by_column': outlier_counts,
    }

    return passed, details


def check_data_types(
    df: pd.DataFrame,
    expected_types: Dict[str, str]
) -> Tuple[bool, Dict]:
    """
    Check if columns have expected data types

    Args:
        df: DataFrame to check
        expected_types: Dictionary of column -> expected type

    Returns:
        (passed, details_dict)
    """
    type_mismatches = []

    for col, expected_type in expected_types.items():
        if col not in df.columns:
            type_mismatches.append({
                'column': col,
                'expected': expected_type,
                'actual': 'missing',
            })
            continue

        actual_type = str(df[col].dtype)

        if expected_type == 'numeric' and not pd.api.types.is_numeric_dtype(df[col]):
            type_mismatches.append({
                'column': col,
                'expected': expected_type,
                'actual': actual_type,
            })
        elif expected_type == 'datetime' and not pd.api.types.is_datetime64_any_dtype(df[col]):
            type_mismatches.append({
                'column': col,
                'expected': expected_type,
                'actual': actual_type,
            })
        elif expected_type == 'categorical' and not pd.api.types.is_categorical_dtype(df[col]):
            # Warning only for categorical
            pass

    passed = len(type_mismatches) == 0

    details = {
        'check': 'data_types',
        'passed': passed,
        'type_mismatches': type_mismatches,
    }

    return passed, details


def check_value_ranges(
    df: pd.DataFrame,
    ranges: Dict[str, Tuple[Optional[float], Optional[float]]]
) -> Tuple[bool, Dict]:
    """
    Check if values are within expected ranges

    Args:
        df: DataFrame to check
        ranges: Dictionary of column -> (min, max)

    Returns:
        (passed, details_dict)
    """
    violations = {}

    for col, (min_val, max_val) in ranges.items():
        if col not in df.columns:
            continue

        out_of_range = pd.Series(False, index=df.index)

        if min_val is not None:
            out_of_range |= df[col] < min_val

        if max_val is not None:
            out_of_range |= df[col] > max_val

        violations[col] = int(out_of_range.sum())

    total_violations = sum(violations.values())
    passed = total_violations == 0

    details = {
        'check': 'value_ranges',
        'passed': passed,
        'total_violations': total_violations,
        'violations_by_column': violations,
    }

    return passed, details


def check_duplicates(
    df: pd.DataFrame,
    subset: Optional[List[str]] = None
) -> Tuple[bool, Dict]:
    """
    Check for duplicate rows

    Args:
        df: DataFrame to check
        subset: Columns to check for duplicates (None = all columns)

    Returns:
        (passed, details_dict)
    """
    duplicates = df.duplicated(subset=subset)
    duplicate_count = int(duplicates.sum())
    duplicate_rate = duplicate_count / len(df)

    passed = duplicate_count == 0

    details = {
        'check': 'duplicates',
        'passed': passed,
        'duplicate_count': duplicate_count,
        'duplicate_rate': duplicate_rate,
    }

    return passed, details


def check_class_imbalance(
    y: pd.Series,
    min_ratio: float = 0.1
) -> Tuple[bool, Dict]:
    """
    Check for severe class imbalance

    Args:
        y: Target variable
        min_ratio: Minimum ratio of minority to majority class

    Returns:
        (passed, details_dict)
    """
    class_counts = y.value_counts()
    minority_count = class_counts.min()
    majority_count = class_counts.max()

    imbalance_ratio = minority_count / majority_count

    passed = imbalance_ratio >= min_ratio

    details = {
        'check': 'class_imbalance',
        'passed': passed,
        'min_ratio_threshold': min_ratio,
        'actual_ratio': imbalance_ratio,
        'class_distribution': class_counts.to_dict(),
    }

    return passed, details


def run_data_quality_checks(
    df: pd.DataFrame,
    target: Optional[pd.Series] = None,
    config: Optional[Dict] = None
) -> DataQualityReport:
    """
    Run comprehensive data quality checks

    Args:
        df: DataFrame to validate
        target: Target variable (for classification checks)
        config: Configuration for checks

    Returns:
        DataQualityReport
    """
    config = config or {}

    checks = []
    issues = []
    warnings = []

    # Check 1: Missing values
    passed, details = check_missing_values(
        df,
        max_missing_rate=config.get('max_missing_rate', 0.1)
    )
    checks.append(passed)
    if not passed:
        issues.append(details)
    else:
        warnings.append({
            'check': 'missing_values',
            'message': f"Total missing: {details['total_missing']}",
        })

    # Check 2: Data types
    if 'expected_types' in config:
        passed, details = check_data_types(df, config['expected_types'])
        checks.append(passed)
        if not passed:
            issues.append(details)

    # Check 3: Value ranges
    if 'value_ranges' in config:
        passed, details = check_value_ranges(df, config['value_ranges'])
        checks.append(passed)
        if not passed:
            issues.append(details)

    # Check 4: Outliers
    numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
    if numeric_columns:
        passed, details = check_outliers(
            df,
            columns=numeric_columns,
            method=config.get('outlier_method', 'iqr'),
            threshold=config.get('outlier_threshold', 1.5)
        )
        checks.append(passed)
        if not passed:
            warnings.append(details)

    # Check 5: Duplicates
    passed, details = check_duplicates(df, subset=config.get('duplicate_subset'))
    checks.append(passed)
    if not passed:
        issues.append(details)

    # Check 6: Class imbalance (if target provided)
    if target is not None:
        passed, details = check_class_imbalance(
            target,
            min_ratio=config.get('min_class_ratio', 0.1)
        )
        checks.append(passed)
        if not passed:
            warnings.append(details)

    # Calculate statistics
    statistics = {
        'n_rows': len(df),
        'n_columns': len(df.columns),
        'n_numeric_columns': len(numeric_columns),
        'memory_usage_mb': df.memory_usage(deep=True).sum() / 1024 / 1024,
    }

    # Build report
    total_checks = len(checks)
    passed_checks = sum(checks)
    failed_checks = total_checks - passed_checks

    report = DataQualityReport(
        passed=failed_checks == 0,
        total_checks=total_checks,
        passed_checks=passed_checks,
        failed_checks=failed_checks,
        issues=issues,
        warnings=warnings,
        statistics=statistics,
    )

    return report


def print_data_quality_report(report: DataQualityReport):
    """Print data quality report in human-readable format"""
    print("=" * 60)
    print("Data Quality Report")
    print("=" * 60)
    print()

    # Summary
    status = "✓ PASSED" if report.passed else "✗ FAILED"
    print(f"Status: {status}")
    print(f"Checks: {report.passed_checks}/{report.total_checks} passed")
    print()

    # Statistics
    print("Dataset Statistics:")
    for key, value in report.statistics.items():
        print(f"  {key}: {value}")
    print()

    # Issues
    if report.issues:
        print(f"Issues ({len(report.issues)}):")
        for issue in report.issues:
            print(f"  ✗ {issue['check']}")
            for key, value in issue.items():
                if key != 'check':
                    print(f"      {key}: {value}")
        print()

    # Warnings
    if report.warnings:
        print(f"Warnings ({len(report.warnings)}):")
        for warning in report.warnings:
            check_name = warning.get('check', 'unknown')
            message = warning.get('message', str(warning))
            print(f"  ⚠ {check_name}: {message}")
        print()

    print("=" * 60)
