# ML Pipeline Architecture (DCMMS Release 3)

## 1. Overview
The machine learning pipeline for Generation Forecasting 2.0 supports both traditional statistical models (ARIMA, Prophet) and deep learning models (LSTM, Transformers). It is built on a modular architecture using **Feast** for feature serving and **PyTorch** for model training.

## 2. High-Level Data Flow

```mermaid
graph LR
    A[Telemetry Data] --> B[Feast Feature Store]
    B --> C[Sliding Window Generator]
    C --> D{Model Type?}
    D -- Statistical --> E[ARIMA/Prophet]
    D -- Deep Learning --> F[PyTorch LSTM/Transformer]
    E --> G[Model Registry (MLflow)]
    F --> G
    G --> H[Inference Service (KServe)]
```

## 3. Pipeline Components

### 3.1 Data Preparation (The "Sliding Window")
For Deep Learning models, time-series data must be transformed into 3D tensors.
*   **Input:** `(Batch_Size, Time_Steps, Feature_Count)`
*   **Time Steps:** 168 hours (7 days lookback).
*   **Scaling:** MinMax scaling per-feature (0...1 range) to ensure gradient stability.

### 3.2 Feature Engineering (Feast)
*   **Raw Features:** `generation_mw`, `wind_speed`, `irradiation`.
*   **Derived Features:**
    *   `rolling_mean_24h`
    *   `rolling_std_24h`
    *   `lag_24h` (auto-correlation)
    *   `cyclical_hour_sin`, `cyclical_hour_cos` (time encoding)

### 3.3 Training Infrastructure
*   **Framework:** PyTorch
*   **Hardware:** Single GPU (T4/V100) recommended for Transformer training.
*   **Loss Function:**
    *   *Solar:* MSE (Mean Squared Error)
    *   *Wind:* Quantile Loss (to predict p10, p50, p90 intervals)

### 3.4 Inference Strategy
To minimize latency:
*   **ONNX Runtime:** Models are exported to ONNX format for faster CPU inference.
*   **Batch Inference:** Forecasts are generated in batches for all sites every 15 minutes.
