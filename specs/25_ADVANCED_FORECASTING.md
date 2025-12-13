# Specification: Advanced Forecasting (Version 2.0)

**Feature ID:** DCMMS-25-ADV-FORECAST
**Status:** DRAFT
**Owner:** AI/ML Team
**Target Release:** Release 3 (Sprint 20+)

## 1. Overview
This specification defines the implementation of "Generation Forecasting 2.0", introducing Deep Learning models (LSTM and Transformer) to replace or augment the existing statistical models (ARIMA/SARIMA) for Solar and Wind power generation. It also covers the "Model Tournament" UX, allowing users to compare model performance.

## 2. Mathematical Models

### 2.1 Long Short-Term Memory (LSTM)
*   **Architecture:** Stacked LSTM (2-3 layers) with Dropout.
*   **Input Tensor:** `(Batch, Time_Steps, Features)`
    *   `Time_Steps`: 168 hours (past 7 days)
    *   `Features`: [Generation, Irradiation/WindSpeed, Temperature, HourOfDay, DayOfYear]
*   **Output:** `(Batch, Forecast_Horizon)`
    *   Solar: 48 hours
    *   Wind: 24 hours (96 intervals of 15-min)
*   **Loss Function:** MSE (Mean Squared Error) or Huber Loss (for robustness).

### 2.2 Time-Series Transformer
*   **Architecture:** Encoder-only Transformer or Temporal Fusion Transformer (TFT).
*   **Attention Mechanism:** Multi-head self-attention to capture long-range dependencies (e.g., seasonal patterns from 30 days ago).
*   **Positional Encoding:** Sine/Cosine embeddings for temporal context.

### 2.3 Model Tournament (Comparison Engine)
*   **Logic:** When "Generate Forecast" is clicked, user can select "Tournament Mode".
*   **Execution:** Runs ARIMA, Prophet, LSTM, and Transformer in parallel (or sequential depending on compute).
*   **Result:** Returns all 4 trajectories + computed MAPE/RMSE for the validation set (most recent known data).

## 3. Architecture Changes

### 3.1 ML Service (`ml/`)
*   **Framework:** Move from `statsmodels` (CPU) to `PyTorch` (Supporting GPU/CPU).
*   **Data Loading:** Custom `Dataset` and `DataLoader` for sliding window creation.
*   **Training Pipeline:**
    *   Offline Training: Weekly retraining on full dataset.
    *   Online Inference: Loading saved `.pt` weights.

### 3.2 Backend API (`backend/`)
*   **New Endpoint:** `POST /api/v1/forecasts/tournament`
    *   Payload: `{ siteId: string, modelTypes: ["arima", "lstm"] }`
*   **Response:**
    ```json
    {
      "forecasts": {
        "arima": { "values": [...], "confidence": 0.85, "executionTimeMs": 150 },
        "lstm": { "values": [...], "confidence": 0.92, "executionTimeMs": 800 }
      },
      "winner": "lstm"
    }
    ```

## 4. User Experience (UX)

### 4.1 The "Data Crunching" Experience
Deep learning models take longer to infer (500ms - 2s) than ARIMA (<100ms).
*   **UI State:** "Analyzing historical patterns..." -> "Running Neural Network..." -> "Finalizing Predictions".
*   **Visual:** Progress bar or Step-indicator.

### 4.2 Visualization
*   **Graph:** Switchable layers. Toggle "LSTM" vs "ARIMA" lines on the same axis.
*   **Confidence Bands:** LSTM provided using Quantile Regression or Monte Carlo Dropout (optional advanced feature).

## 5. Implementation Tasks (Breakdown)
See `task.md` for specific checklist.
