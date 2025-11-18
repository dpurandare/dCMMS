#!/usr/bin/env python3
"""
Model Evaluation and Validation

Comprehensive model evaluation with metrics, error analysis, and SHAP explanations.
"""

import os
import sys
import argparse
import json
from pathlib import Path
from typing import Dict, Optional, Tuple

import pandas as pd
import numpy as np
import mlflow
import mlflow.pyfunc
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    precision_recall_curve,
    roc_curve,
)
import matplotlib.pyplot as plt
import seaborn as sns

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from datasets.load_dataset import load_dataset


class ModelEvaluator:
    """Comprehensive model evaluation"""

    def __init__(self, model, model_name: str = "model"):
        """
        Initialize evaluator

        Args:
            model: Trained model
            model_name: Model name for reporting
        """
        self.model = model
        self.model_name = model_name
        self.evaluation_results = {}

    def evaluate(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        threshold: float = 0.5
    ) -> Dict:
        """
        Evaluate model on test set

        Args:
            X_test: Test features
            y_test: Test labels
            threshold: Classification threshold

        Returns:
            Dictionary with evaluation metrics
        """
        print("=" * 70)
        print(f"Model Evaluation: {self.model_name}")
        print("=" * 70)

        # Predictions
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_proba >= threshold).astype(int)

        # Metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, zero_division=0),
            'recall': recall_score(y_test, y_pred, zero_division=0),
            'f1': f1_score(y_test, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_proba),
            'threshold': threshold,
        }

        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        metrics.update({
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp),
        })

        # Print metrics
        print("\nTest Set Metrics:")
        print("-" * 70)
        print(f"  Accuracy:  {metrics['accuracy']:.4f}")
        print(f"  Precision: {metrics['precision']:.4f}  (of predicted failures, how many were correct?)")
        print(f"  Recall:    {metrics['recall']:.4f}  (of actual failures, how many did we catch?)")
        print(f"  F1 Score:  {metrics['f1']:.4f}")
        print(f"  ROC-AUC:   {metrics['roc_auc']:.4f}")
        print()

        print("Confusion Matrix:")
        print("-" * 70)
        print(f"  True Negatives:  {tn:5d}  (correctly predicted no failure)")
        print(f"  False Positives: {fp:5d}  (false alarms)")
        print(f"  False Negatives: {fn:5d}  (missed failures) ⚠️  CRITICAL!")
        print(f"  True Positives:  {tp:5d}  (correctly predicted failure)")
        print()

        # Classification report
        print("Classification Report:")
        print("-" * 70)
        print(classification_report(y_test, y_pred, target_names=['No Failure', 'Failure']))

        # Check targets
        if metrics['precision'] >= 0.70:
            print("  ✓ Precision target met (≥70%)")
        else:
            print(f"  ⚠ Precision below target (got {metrics['precision']:.1%}, need ≥70%)")

        if metrics['recall'] >= 0.60:
            print("  ✓ Recall target met (≥60%)")
        else:
            print(f"  ⚠ Recall below target (got {metrics['recall']:.1%}, need ≥60%)")

        print()

        self.evaluation_results = metrics
        return metrics

    def tune_threshold(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        metric: str = 'f1'
    ) -> Tuple[float, Dict]:
        """
        Tune classification threshold to optimize metric

        Args:
            X_test: Test features
            y_test: Test labels
            metric: Metric to optimize ('f1', 'precision', 'recall')

        Returns:
            Tuple of (best_threshold, metrics_at_best_threshold)
        """
        print("=" * 70)
        print("Threshold Tuning")
        print("=" * 70)
        print(f"Optimizing for: {metric}")
        print()

        # Get prediction probabilities
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]

        # Try different thresholds
        thresholds = np.arange(0.1, 0.9, 0.05)
        results = []

        for threshold in thresholds:
            y_pred = (y_pred_proba >= threshold).astype(int)

            result = {
                'threshold': threshold,
                'precision': precision_score(y_test, y_pred, zero_division=0),
                'recall': recall_score(y_test, y_pred, zero_division=0),
                'f1': f1_score(y_test, y_pred, zero_division=0),
            }
            results.append(result)

        results_df = pd.DataFrame(results)

        # Find best threshold
        best_idx = results_df[metric].idxmax()
        best_threshold = results_df.loc[best_idx, 'threshold']
        best_metrics = results_df.loc[best_idx].to_dict()

        print(f"Best threshold: {best_threshold:.2f}")
        print(f"  Precision: {best_metrics['precision']:.4f}")
        print(f"  Recall:    {best_metrics['recall']:.4f}")
        print(f"  F1 Score:  {best_metrics['f1']:.4f}")
        print()

        # Plot threshold vs metrics
        fig, ax = plt.subplots(figsize=(10, 6))

        ax.plot(results_df['threshold'], results_df['precision'], label='Precision', marker='o')
        ax.plot(results_df['threshold'], results_df['recall'], label='Recall', marker='s')
        ax.plot(results_df['threshold'], results_df['f1'], label='F1 Score', marker='^')

        ax.axvline(best_threshold, color='red', linestyle='--', alpha=0.5, label=f'Best ({best_threshold:.2f})')

        ax.set_xlabel('Threshold')
        ax.set_ylabel('Score')
        ax.set_title('Threshold Tuning: Precision, Recall, F1')
        ax.legend()
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig('/tmp/threshold_tuning.png', dpi=150)
        print(f"Saved plot: /tmp/threshold_tuning.png")
        print()

        return best_threshold, best_metrics

    def error_analysis(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        threshold: float = 0.5,
        top_n: int = 10
    ) -> pd.DataFrame:
        """
        Analyze false positives and false negatives

        Args:
            X_test: Test features
            y_test: Test labels
            threshold: Classification threshold
            top_n: Number of top errors to show

        Returns:
            DataFrame with error analysis
        """
        print("=" * 70)
        print("Error Analysis")
        print("=" * 70)

        # Predictions
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_proba >= threshold).astype(int)

        # Create error dataframe
        errors_df = X_test.copy()
        errors_df['true_label'] = y_test.values
        errors_df['predicted_label'] = y_pred
        errors_df['prediction_probability'] = y_pred_proba
        errors_df['is_error'] = (y_test.values != y_pred).astype(int)

        # False positives (predicted failure, but no failure)
        fp_df = errors_df[(errors_df['true_label'] == 0) & (errors_df['predicted_label'] == 1)]
        print(f"\nFalse Positives: {len(fp_df)}")
        print("  (Predicted failure, but asset didn't fail)")
        if len(fp_df) > 0:
            print(f"\n  Top {min(top_n, len(fp_df))} False Positives (highest confidence):")
            fp_top = fp_df.nlargest(top_n, 'prediction_probability')
            for idx, row in fp_top.iterrows():
                print(f"    Probability: {row['prediction_probability']:.3f}")

        # False negatives (predicted no failure, but failed)
        fn_df = errors_df[(errors_df['true_label'] == 1) & (errors_df['predicted_label'] == 0)]
        print(f"\nFalse Negatives: {len(fn_df)} ⚠️  CRITICAL!")
        print("  (Predicted no failure, but asset failed)")
        if len(fn_df) > 0:
            print(f"\n  Top {min(top_n, len(fn_df))} False Negatives (lowest confidence):")
            fn_top = fn_df.nsmallest(top_n, 'prediction_probability')
            for idx, row in fn_top.iterrows():
                print(f"    Probability: {row['prediction_probability']:.3f}")

        print()

        return errors_df

    def plot_confusion_matrix(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        threshold: float = 0.5,
        save_path: str = '/tmp/confusion_matrix.png'
    ):
        """
        Plot confusion matrix

        Args:
            X_test: Test features
            y_test: Test labels
            threshold: Classification threshold
            save_path: Path to save plot
        """
        # Predictions
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_proba >= threshold).astype(int)

        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)

        # Plot
        fig, ax = plt.subplots(figsize=(8, 6))

        sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            cmap='Blues',
            xticklabels=['No Failure', 'Failure'],
            yticklabels=['No Failure', 'Failure'],
            ax=ax
        )

        ax.set_xlabel('Predicted Label')
        ax.set_ylabel('True Label')
        ax.set_title(f'Confusion Matrix: {self.model_name}')

        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        print(f"Saved confusion matrix: {save_path}")

    def plot_roc_curve(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        save_path: str = '/tmp/roc_curve.png'
    ):
        """
        Plot ROC curve

        Args:
            X_test: Test features
            y_test: Test labels
            save_path: Path to save plot
        """
        # Predictions
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]

        # ROC curve
        fpr, tpr, thresholds = roc_curve(y_test, y_pred_proba)
        roc_auc = roc_auc_score(y_test, y_pred_proba)

        # Plot
        fig, ax = plt.subplots(figsize=(8, 6))

        ax.plot(fpr, tpr, label=f'{self.model_name} (AUC = {roc_auc:.3f})', linewidth=2)
        ax.plot([0, 1], [0, 1], 'k--', label='Random (AUC = 0.500)', linewidth=1)

        ax.set_xlabel('False Positive Rate')
        ax.set_ylabel('True Positive Rate')
        ax.set_title('ROC Curve')
        ax.legend()
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        print(f"Saved ROC curve: {save_path}")

    def plot_precision_recall_curve(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        save_path: str = '/tmp/precision_recall_curve.png'
    ):
        """
        Plot Precision-Recall curve

        Args:
            X_test: Test features
            y_test: Test labels
            save_path: Path to save plot
        """
        # Predictions
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]

        # Precision-Recall curve
        precision, recall, thresholds = precision_recall_curve(y_test, y_pred_proba)

        # Plot
        fig, ax = plt.subplots(figsize=(8, 6))

        ax.plot(recall, precision, linewidth=2)

        ax.set_xlabel('Recall')
        ax.set_ylabel('Precision')
        ax.set_title('Precision-Recall Curve')
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        print(f"Saved Precision-Recall curve: {save_path}")

    def feature_importance_shap(
        self,
        X_test: pd.DataFrame,
        top_n: int = 10,
        save_path: str = '/tmp/shap_values.png'
    ):
        """
        Calculate and plot SHAP feature importance

        Args:
            X_test: Test features
            top_n: Number of top features to show
            save_path: Path to save plot
        """
        print("=" * 70)
        print("SHAP Feature Importance")
        print("=" * 70)

        try:
            import shap

            # Create SHAP explainer
            print("Calculating SHAP values...")

            # Use TreeExplainer for tree-based models
            explainer = shap.TreeExplainer(self.model)

            # Calculate SHAP values (on a sample to speed up)
            sample_size = min(100, len(X_test))
            X_sample = X_test.sample(n=sample_size, random_state=42)

            shap_values = explainer.shap_values(X_sample)

            # Get mean absolute SHAP values for each feature
            if isinstance(shap_values, list):
                # Binary classification (shap_values is list of 2 arrays)
                shap_values = shap_values[1]  # Use positive class

            mean_abs_shap = np.abs(shap_values).mean(axis=0)

            # Create feature importance dataframe
            feature_importance = pd.DataFrame({
                'feature': X_test.columns,
                'mean_abs_shap': mean_abs_shap
            }).sort_values('mean_abs_shap', ascending=False)

            print(f"\nTop {top_n} Features (by SHAP importance):")
            print("-" * 70)
            for i, row in feature_importance.head(top_n).iterrows():
                print(f"  {row['feature']:<40} {row['mean_abs_shap']:.4f}")

            print()

            # Plot SHAP summary
            fig, ax = plt.subplots(figsize=(10, 6))

            shap.summary_plot(
                shap_values,
                X_sample,
                plot_type="bar",
                max_display=top_n,
                show=False
            )

            plt.tight_layout()
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Saved SHAP plot: {save_path}")

            return feature_importance

        except ImportError:
            print("⚠ SHAP not installed. Skipping SHAP analysis.")
            print("Install with: pip install shap")
            return None

    def create_model_card(
        self,
        metrics: Dict,
        dataset_metadata: Dict,
        output_path: str = '/tmp/model_card.md'
    ):
        """
        Create model card documentation

        Args:
            metrics: Evaluation metrics
            dataset_metadata: Dataset metadata
            output_path: Path to save model card
        """
        print("=" * 70)
        print("Creating Model Card")
        print("=" * 70)

        model_card = f"""# Model Card: {self.model_name}

## Model Details

- **Model Name:** {self.model_name}
- **Model Type:** Predictive Maintenance - Binary Classification
- **Task:** Predict asset failure within 7 days
- **Training Date:** {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}
- **Framework:** scikit-learn / XGBoost
- **Version:** 1.0

## Intended Use

**Primary Use:**
- Predict which assets are likely to fail within the next 7 days
- Enable proactive maintenance scheduling
- Reduce unplanned downtime and repair costs

**Out-of-Scope Uses:**
- Do NOT use for immediate safety-critical decisions
- Do NOT use without domain expert review
- Do NOT use on asset types not in training data

## Training Data

- **Dataset Version:** {dataset_metadata.get('dataset_version', 'unknown')}
- **Training Samples:** {dataset_metadata.get('n_train_samples', 'unknown')}
- **Test Samples:** {dataset_metadata.get('n_test_samples', 'unknown')}
- **Features:** {dataset_metadata.get('n_features', 'unknown')}
- **Positive Rate (train):** {dataset_metadata.get('train_positive_rate', 0):.2%}
- **Positive Rate (test):** {dataset_metadata.get('test_positive_rate', 0):.2%}
- **Time Period:** {dataset_metadata.get('reference_date', 'unknown')}

## Model Performance

### Test Set Metrics

| Metric      | Value    | Target   | Status |
|-------------|----------|----------|--------|
| Accuracy    | {metrics['accuracy']:.3f}    | -        | -      |
| Precision   | {metrics['precision']:.3f}    | ≥0.70    | {'✓' if metrics['precision'] >= 0.70 else '⚠'} |
| Recall      | {metrics['recall']:.3f}    | ≥0.60    | {'✓' if metrics['recall'] >= 0.60 else '⚠'} |
| F1 Score    | {metrics['f1']:.3f}    | -        | -      |
| ROC-AUC     | {metrics['roc_auc']:.3f}    | -        | -      |

### Confusion Matrix

|                 | Predicted: No Failure | Predicted: Failure |
|-----------------|----------------------|-------------------|
| **Actual: No Failure** | {metrics['true_negatives']:,} (TN)           | {metrics['false_positives']:,} (FP)          |
| **Actual: Failure**    | {metrics['false_negatives']:,} (FN) ⚠️        | {metrics['true_positives']:,} (TP)           |

### Interpretation

- **True Negatives ({metrics['true_negatives']}):** Correctly predicted no failure
- **False Positives ({metrics['false_positives']}):** False alarms (unnecessary maintenance)
- **False Negatives ({metrics['false_negatives']}):** Missed failures (CRITICAL - could lead to unplanned downtime)
- **True Positives ({metrics['true_positives']}):** Correctly predicted failure

## Limitations

1. **Class Imbalance:** Model trained on imbalanced data (failures are rare events)
2. **Temporal Coverage:** Only trained on last year of data
3. **Asset Types:** Performance may vary across different asset types
4. **Seasonality:** May not capture seasonal patterns if training data limited
5. **False Negatives:** Current recall is {metrics['recall']:.1%} (missing {100*(1-metrics['recall']):.1f}% of failures)

## Ethical Considerations

1. **Bias:** Check for performance disparities across asset types, sites, manufacturers
2. **Transparency:** Model predictions should be reviewed by domain experts
3. **Safety:** Do NOT use for immediate safety decisions without human oversight
4. **Accountability:** Maintenance decisions should not rely solely on model predictions

## Recommendations

1. **Threshold Tuning:** Adjust classification threshold based on business cost of false positives vs false negatives
2. **Human-in-the-Loop:** Always have maintenance expert review high-risk predictions
3. **Continuous Monitoring:** Track model performance over time, retrain if drift detected
4. **Error Analysis:** Investigate false negatives to understand failure modes not captured by model

## Contact

For questions or issues with this model, contact the ML/AI team.

## Changelog

### Version 1.0 - {pd.Timestamp.now().strftime('%Y-%m-%d')}
- Initial model release
- Baseline model with hyperparameter tuning
- Test F1: {metrics['f1']:.3f}
- Test ROC-AUC: {metrics['roc_auc']:.3f}
"""

        with open(output_path, 'w') as f:
            f.write(model_card)

        print(f"Saved model card: {output_path}")
        print()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Model evaluation and validation')
    parser.add_argument(
        '--model-uri',
        type=str,
        required=True,
        help='MLflow model URI (e.g., runs:/abc123/model)'
    )
    parser.add_argument(
        '--dataset-version',
        type=str,
        default='v1.0',
        help='Dataset version (default: v1.0)'
    )
    parser.add_argument(
        '--threshold',
        type=float,
        default=0.5,
        help='Classification threshold (default: 0.5)'
    )
    parser.add_argument(
        '--tune-threshold',
        action='store_true',
        help='Tune classification threshold'
    )

    args = parser.parse_args()

    # Load dataset
    print("Loading dataset...")
    X_train, X_test, y_train, y_test, metadata = load_dataset(
        dataset_version=args.dataset_version
    )

    # Load model
    print(f"Loading model from: {args.model_uri}")
    model = mlflow.pyfunc.load_model(args.model_uri)

    # Create evaluator
    evaluator = ModelEvaluator(model, model_name="Predictive Maintenance Model")

    # Tune threshold if requested
    if args.tune_threshold:
        best_threshold, _ = evaluator.tune_threshold(X_test, y_test, metric='f1')
        threshold = best_threshold
    else:
        threshold = args.threshold

    # Evaluate
    metrics = evaluator.evaluate(X_test, y_test, threshold=threshold)

    # Error analysis
    errors_df = evaluator.error_analysis(X_test, y_test, threshold=threshold)

    # Visualizations
    evaluator.plot_confusion_matrix(X_test, y_test, threshold=threshold)
    evaluator.plot_roc_curve(X_test, y_test)
    evaluator.plot_precision_recall_curve(X_test, y_test)

    # SHAP feature importance
    evaluator.feature_importance_shap(X_test, top_n=10)

    # Create model card
    evaluator.create_model_card(metrics, metadata)

    print("\n" + "=" * 70)
    print("Evaluation Complete!")
    print("=" * 70)
    print("Generated artifacts:")
    print("  - /tmp/confusion_matrix.png")
    print("  - /tmp/roc_curve.png")
    print("  - /tmp/precision_recall_curve.png")
    print("  - /tmp/shap_values.png")
    print("  - /tmp/model_card.md")
    print()


if __name__ == '__main__':
    main()
