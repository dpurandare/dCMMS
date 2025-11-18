#!/usr/bin/env python3
"""
Drift Detection for ML Models

Detects data drift and concept drift to monitor model health.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


class DriftDetector:
    """Detect data drift and concept drift"""

    def __init__(
        self,
        reference_data: pd.DataFrame,
        reference_labels: Optional[pd.Series] = None,
        alert_threshold: float = 0.05
    ):
        """
        Initialize drift detector

        Args:
            reference_data: Training/reference dataset features
            reference_labels: Training/reference dataset labels (optional)
            alert_threshold: P-value threshold for drift alerts (default: 0.05)
        """
        self.reference_data = reference_data
        self.reference_labels = reference_labels
        self.alert_threshold = alert_threshold

        # Store reference statistics
        self.reference_stats = self._compute_statistics(reference_data)

    def _compute_statistics(self, data: pd.DataFrame) -> Dict:
        """
        Compute summary statistics for data

        Args:
            data: Input DataFrame

        Returns:
            Dictionary with statistics per feature
        """
        stats_dict = {}

        for col in data.columns:
            if pd.api.types.is_numeric_dtype(data[col]):
                stats_dict[col] = {
                    'mean': data[col].mean(),
                    'std': data[col].std(),
                    'min': data[col].min(),
                    'max': data[col].max(),
                    'median': data[col].median(),
                    'q25': data[col].quantile(0.25),
                    'q75': data[col].quantile(0.75),
                }
            else:
                # Categorical feature
                stats_dict[col] = {
                    'value_counts': data[col].value_counts().to_dict()
                }

        return stats_dict

    def detect_data_drift_ks(
        self,
        current_data: pd.DataFrame,
        feature_name: str
    ) -> Tuple[bool, float, Dict]:
        """
        Detect data drift using Kolmogorov-Smirnov test

        Args:
            current_data: Current/production data
            feature_name: Feature to test

        Returns:
            Tuple of (drift_detected, p_value, details)
        """
        if feature_name not in self.reference_data.columns:
            raise ValueError(f"Feature {feature_name} not in reference data")

        if not pd.api.types.is_numeric_dtype(self.reference_data[feature_name]):
            return False, 1.0, {'error': 'KS test requires numeric features'}

        # Get reference and current distributions
        ref_dist = self.reference_data[feature_name].dropna()
        curr_dist = current_data[feature_name].dropna()

        if len(ref_dist) < 10 or len(curr_dist) < 10:
            return False, 1.0, {'error': 'Insufficient data for KS test'}

        # Perform KS test
        statistic, p_value = stats.ks_2samp(ref_dist, curr_dist)

        drift_detected = p_value < self.alert_threshold

        details = {
            'test': 'Kolmogorov-Smirnov',
            'statistic': float(statistic),
            'p_value': float(p_value),
            'threshold': self.alert_threshold,
            'drift_detected': drift_detected,
            'ref_mean': float(ref_dist.mean()),
            'curr_mean': float(curr_dist.mean()),
            'ref_std': float(ref_dist.std()),
            'curr_std': float(curr_dist.std()),
        }

        return drift_detected, p_value, details

    def detect_data_drift_chi2(
        self,
        current_data: pd.DataFrame,
        feature_name: str
    ) -> Tuple[bool, float, Dict]:
        """
        Detect data drift using Chi-square test (for categorical features)

        Args:
            current_data: Current/production data
            feature_name: Feature to test

        Returns:
            Tuple of (drift_detected, p_value, details)
        """
        if feature_name not in self.reference_data.columns:
            raise ValueError(f"Feature {feature_name} not in reference data")

        # Get value counts
        ref_counts = self.reference_data[feature_name].value_counts()
        curr_counts = current_data[feature_name].value_counts()

        # Align indices
        all_values = set(ref_counts.index) | set(curr_counts.index)

        ref_freq = np.array([ref_counts.get(v, 0) for v in all_values])
        curr_freq = np.array([curr_counts.get(v, 0) for v in all_values])

        # Perform chi-square test
        try:
            statistic, p_value = stats.chisquare(curr_freq, f_exp=ref_freq)

            drift_detected = p_value < self.alert_threshold

            details = {
                'test': 'Chi-square',
                'statistic': float(statistic),
                'p_value': float(p_value),
                'threshold': self.alert_threshold,
                'drift_detected': drift_detected,
            }

            return drift_detected, p_value, details

        except Exception as e:
            return False, 1.0, {'error': str(e)}

    def detect_all_data_drift(
        self,
        current_data: pd.DataFrame
    ) -> Dict:
        """
        Detect data drift for all features

        Args:
            current_data: Current/production data

        Returns:
            Dictionary with drift results per feature
        """
        print("Detecting data drift...")

        results = {}
        drifted_features = []

        for col in self.reference_data.columns:
            # Skip if column not in current data
            if col not in current_data.columns:
                continue

            # Use appropriate test based on feature type
            if pd.api.types.is_numeric_dtype(self.reference_data[col]):
                drift_detected, p_value, details = self.detect_data_drift_ks(
                    current_data, col
                )
            else:
                drift_detected, p_value, details = self.detect_data_drift_chi2(
                    current_data, col
                )

            results[col] = details

            if drift_detected:
                drifted_features.append(col)

        # Summary
        results['summary'] = {
            'total_features': len(results) - 1,  # -1 for summary itself
            'drifted_features': len(drifted_features),
            'drift_percentage': len(drifted_features) / (len(results) - 1) * 100,
            'drifted_feature_names': drifted_features,
        }

        print(f"  Drift detected in {len(drifted_features)}/{len(results)-1} features")

        return results

    def detect_concept_drift(
        self,
        model,
        current_data: pd.DataFrame,
        current_labels: pd.Series,
        baseline_f1: float,
        threshold_drop: float = 0.05
    ) -> Tuple[bool, Dict]:
        """
        Detect concept drift (model performance degradation)

        Args:
            model: Trained model
            current_data: Current/production data
            current_labels: Current/production labels
            baseline_f1: Baseline F1 score (from training)
            threshold_drop: Maximum acceptable F1 drop (default: 5%)

        Returns:
            Tuple of (drift_detected, details)
        """
        print("Detecting concept drift...")

        from sklearn.metrics import f1_score, precision_score, recall_score

        # Predictions on current data
        y_pred = model.predict(current_data)

        # Calculate metrics
        current_f1 = f1_score(current_labels, y_pred)
        current_precision = precision_score(current_labels, y_pred, zero_division=0)
        current_recall = recall_score(current_labels, y_pred, zero_division=0)

        # Check for drift
        f1_drop = baseline_f1 - current_f1
        f1_drop_pct = (f1_drop / baseline_f1) * 100

        drift_detected = f1_drop > threshold_drop

        details = {
            'baseline_f1': float(baseline_f1),
            'current_f1': float(current_f1),
            'f1_drop': float(f1_drop),
            'f1_drop_percentage': float(f1_drop_pct),
            'threshold_drop': threshold_drop,
            'drift_detected': drift_detected,
            'current_precision': float(current_precision),
            'current_recall': float(current_recall),
        }

        if drift_detected:
            print(f"  ⚠ Concept drift detected!")
            print(f"    Baseline F1: {baseline_f1:.3f}")
            print(f"    Current F1: {current_f1:.3f}")
            print(f"    Drop: {f1_drop:.3f} ({f1_drop_pct:.1f}%)")
        else:
            print(f"  ✓ No concept drift (F1 drop: {f1_drop:.3f})")

        return drift_detected, details

    def generate_drift_report(
        self,
        data_drift_results: Dict,
        concept_drift_results: Optional[Dict] = None,
        output_path: str = '/tmp/drift_report.json'
    ):
        """
        Generate drift detection report

        Args:
            data_drift_results: Data drift detection results
            concept_drift_results: Concept drift detection results (optional)
            output_path: Path to save report
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'data_drift': data_drift_results,
            'concept_drift': concept_drift_results,
            'alert_required': (
                data_drift_results['summary']['drifted_features'] > 0 or
                (concept_drift_results and concept_drift_results.get('drift_detected', False))
            ),
        }

        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"\nDrift report saved: {output_path}")

        return report

    def plot_feature_distributions(
        self,
        current_data: pd.DataFrame,
        feature_names: List[str],
        save_path: str = '/tmp/feature_distributions.png'
    ):
        """
        Plot feature distributions (reference vs current)

        Args:
            current_data: Current/production data
            feature_names: Features to plot
            save_path: Path to save plot
        """
        n_features = len(feature_names)
        n_cols = min(3, n_features)
        n_rows = (n_features + n_cols - 1) // n_cols

        fig, axes = plt.subplots(n_rows, n_cols, figsize=(5 * n_cols, 4 * n_rows))

        if n_features == 1:
            axes = [axes]
        else:
            axes = axes.flatten()

        for i, feature in enumerate(feature_names):
            if feature not in self.reference_data.columns or feature not in current_data.columns:
                continue

            ax = axes[i]

            if pd.api.types.is_numeric_dtype(self.reference_data[feature]):
                # Plot histograms for numeric features
                ax.hist(
                    self.reference_data[feature].dropna(),
                    bins=30,
                    alpha=0.5,
                    label='Reference',
                    density=True
                )
                ax.hist(
                    current_data[feature].dropna(),
                    bins=30,
                    alpha=0.5,
                    label='Current',
                    density=True
                )
            else:
                # Plot bar charts for categorical features
                ref_counts = self.reference_data[feature].value_counts(normalize=True)
                curr_counts = current_data[feature].value_counts(normalize=True)

                x = np.arange(len(ref_counts))
                width = 0.35

                ax.bar(x - width/2, ref_counts.values, width, label='Reference', alpha=0.7)
                ax.bar(x + width/2, curr_counts.values, width, label='Current', alpha=0.7)

                ax.set_xticks(x)
                ax.set_xticklabels(ref_counts.index, rotation=45, ha='right')

            ax.set_title(feature)
            ax.set_xlabel('Value')
            ax.set_ylabel('Density' if pd.api.types.is_numeric_dtype(self.reference_data[feature]) else 'Frequency')
            ax.legend()
            ax.grid(True, alpha=0.3)

        # Hide unused subplots
        for i in range(n_features, len(axes)):
            axes[i].axis('off')

        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        print(f"Saved feature distributions: {save_path}")

    def plot_drift_dashboard(
        self,
        data_drift_results: Dict,
        save_path: str = '/tmp/drift_dashboard.png'
    ):
        """
        Plot drift detection dashboard

        Args:
            data_drift_results: Data drift detection results
            save_path: Path to save dashboard
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

        # Plot 1: Number of drifted features
        summary = data_drift_results['summary']

        categories = ['No Drift', 'Drift Detected']
        values = [
            summary['total_features'] - summary['drifted_features'],
            summary['drifted_features']
        ]

        colors = ['#2ecc71', '#e74c3c']
        ax1.bar(categories, values, color=colors, alpha=0.7)
        ax1.set_ylabel('Number of Features')
        ax1.set_title('Data Drift Summary')
        ax1.grid(True, axis='y', alpha=0.3)

        for i, v in enumerate(values):
            ax1.text(i, v + 0.5, str(v), ha='center', va='bottom', fontweight='bold')

        # Plot 2: P-values per feature
        features = []
        p_values = []

        for feat, result in data_drift_results.items():
            if feat == 'summary':
                continue

            if 'p_value' in result:
                features.append(feat)
                p_values.append(result['p_value'])

        if features:
            # Sort by p-value
            sorted_indices = np.argsort(p_values)
            features = [features[i] for i in sorted_indices]
            p_values = [p_values[i] for i in sorted_indices]

            # Limit to top 15 features
            if len(features) > 15:
                features = features[:15]
                p_values = p_values[:15]

            colors = ['#e74c3c' if p < self.alert_threshold else '#3498db' for p in p_values]

            ax2.barh(features, p_values, color=colors, alpha=0.7)
            ax2.axvline(self.alert_threshold, color='red', linestyle='--', linewidth=2, label=f'Threshold ({self.alert_threshold})')
            ax2.set_xlabel('P-value')
            ax2.set_title('Feature Drift (P-values)')
            ax2.legend()
            ax2.grid(True, axis='x', alpha=0.3)

        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        print(f"Saved drift dashboard: {save_path}")


def send_drift_alert(report: Dict, email_to: Optional[str] = None, slack_webhook: Optional[str] = None):
    """
    Send drift alert via email/Slack

    Args:
        report: Drift report
        email_to: Email address to send alert
        slack_webhook: Slack webhook URL
    """
    if not report['alert_required']:
        print("No alert required (no drift detected)")
        return

    message = f"""
🚨 ML Model Drift Alert

Timestamp: {report['timestamp']}

Data Drift:
- Features drifted: {report['data_drift']['summary']['drifted_features']} / {report['data_drift']['summary']['total_features']}
- Drift percentage: {report['data_drift']['summary']['drift_percentage']:.1f}%
- Drifted features: {', '.join(report['data_drift']['summary']['drifted_feature_names'])}

Concept Drift:
"""

    if report['concept_drift']:
        if report['concept_drift']['drift_detected']:
            message += f"""- ⚠️ CONCEPT DRIFT DETECTED
- Baseline F1: {report['concept_drift']['baseline_f1']:.3f}
- Current F1: {report['concept_drift']['current_f1']:.3f}
- Drop: {report['concept_drift']['f1_drop']:.3f} ({report['concept_drift']['f1_drop_percentage']:.1f}%)
"""
        else:
            message += "- No concept drift detected\n"
    else:
        message += "- Not evaluated\n"

    message += """
Action Required:
1. Review drift report and feature distributions
2. Investigate root cause of drift
3. Consider retraining model with recent data
4. Update monitoring thresholds if necessary
"""

    print("\n" + "=" * 70)
    print("DRIFT ALERT")
    print("=" * 70)
    print(message)

    # TODO: Implement email/Slack integration
    if email_to:
        print(f"TODO: Send email to {email_to}")

    if slack_webhook:
        print(f"TODO: Send Slack message to {slack_webhook}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Drift detection for ML models')
    parser.add_argument(
        '--reference-data',
        type=str,
        required=True,
        help='Path to reference data (Parquet)'
    )
    parser.add_argument(
        '--current-data',
        type=str,
        required=True,
        help='Path to current/production data (Parquet)'
    )
    parser.add_argument(
        '--model-uri',
        type=str,
        help='MLflow model URI for concept drift detection'
    )
    parser.add_argument(
        '--baseline-f1',
        type=float,
        help='Baseline F1 score for concept drift detection'
    )
    parser.add_argument(
        '--alert-threshold',
        type=float,
        default=0.05,
        help='P-value threshold for drift alerts (default: 0.05)'
    )

    args = parser.parse_args()

    # Load reference data
    print("Loading reference data...")
    ref_df = pd.read_parquet(args.reference_data)

    # Separate features and labels
    if 'target' in ref_df.columns:
        ref_labels = ref_df['target']
        ref_features = ref_df.drop(columns=['target'])
    else:
        ref_labels = None
        ref_features = ref_df

    print(f"  Reference data: {len(ref_features)} samples, {len(ref_features.columns)} features")

    # Load current data
    print("Loading current data...")
    curr_df = pd.read_parquet(args.current_data)

    if 'target' in curr_df.columns:
        curr_labels = curr_df['target']
        curr_features = curr_df.drop(columns=['target'])
    else:
        curr_labels = None
        curr_features = curr_df

    print(f"  Current data: {len(curr_features)} samples, {len(curr_features.columns)} features")

    # Create drift detector
    detector = DriftDetector(
        reference_data=ref_features,
        reference_labels=ref_labels,
        alert_threshold=args.alert_threshold
    )

    # Detect data drift
    data_drift_results = detector.detect_all_data_drift(curr_features)

    # Detect concept drift (if model provided)
    concept_drift_results = None
    if args.model_uri and args.baseline_f1 and curr_labels is not None:
        import mlflow
        model = mlflow.pyfunc.load_model(args.model_uri)

        drift_detected, concept_drift_results = detector.detect_concept_drift(
            model,
            curr_features,
            curr_labels,
            baseline_f1=args.baseline_f1,
            threshold_drop=0.05
        )

    # Generate report
    report = detector.generate_drift_report(
        data_drift_results,
        concept_drift_results
    )

    # Visualizations
    drifted_features = data_drift_results['summary']['drifted_feature_names']
    if drifted_features:
        detector.plot_feature_distributions(curr_features, drifted_features[:6])

    detector.plot_drift_dashboard(data_drift_results)

    # Send alert if needed
    send_drift_alert(report)

    print("\n" + "=" * 70)
    print("Drift Detection Complete!")
    print("=" * 70)
    print("Generated artifacts:")
    print("  - /tmp/drift_report.json")
    print("  - /tmp/drift_dashboard.png")
    if drifted_features:
        print("  - /tmp/feature_distributions.png")
    print()


if __name__ == '__main__':
    main()
