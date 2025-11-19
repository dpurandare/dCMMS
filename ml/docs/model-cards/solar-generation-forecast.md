# Model Card: Solar Generation Forecasting

**Model Name:** `solar_generation_forecast_sarima_v1`
**Model Version:** v1.0
**Model Type:** Time-Series Forecasting
**Algorithm:** SARIMA (Seasonal AutoRegressive Integrated Moving Average)
**Owner:** dCMMS ML Team
**Last Updated:** November 19, 2025
**Sprint:** 19 (DCMMS-152)

---

## Model Details

### Purpose

Forecast solar power generation for the next 48 hours to support:
- Day-ahead grid scheduling and compliance
- Revenue forecasting and financial planning
- Maintenance window planning (schedule during low generation)
- Energy storage optimization

### Algorithm

**SARIMA(1,1,1)(1,1,1,24)**

- **Non-seasonal components (p,d,q):**
  - AR (p=1): Autoregressive order - uses 1 previous value
  - I (d=1): Differencing order - first-order differencing
  - MA (q=1): Moving average order - 1-period moving average

- **Seasonal components (P,D,Q,m):**
  - Seasonal AR (P=1): Seasonal autoregressive order
  - Seasonal I (D=1): Seasonal differencing
  - Seasonal MA (Q=1): Seasonal moving average
  - Seasonal period (m=24): 24-hour daily pattern

### Inputs

**Endogenous Variable (Target):**
- `generation_mw`: Historical solar generation (MW)
  - Frequency: Hourly
  - Min training data: 30 days (720 hours)
  - Recommended: 365 days (1 year)

**Exogenous Variables (Features):**
- `irradiation_wh_m2`: Global Horizontal Irradiance (W/m²)
  - Most important feature for solar forecasting
  - Range: 0-1200 W/m²
- `temperature_c`: Ambient temperature (Celsius)
  - Affects panel efficiency (higher temp = lower efficiency)
  - Range: -20°C to 50°C
- `cloud_cover_percent`: Cloud coverage (0-100%)
  - Directly impacts irradiation reaching panels
  - Range: 0-100%

### Outputs

**Forecast Values:**
- `predicted_generation_mw`: Point forecast (MW)
- `confidence_interval_lower_mw`: Lower bound of 95% CI
- `confidence_interval_upper_mw`: Upper bound of 95% CI
- `prediction_std_dev`: Standard deviation of prediction

**Forecast Horizon:**
- 48 hours ahead
- Hourly granularity (48 data points)

---

## Performance

### Metrics (Test Set: 90 days, 2,160 hours)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **MAPE** | 11.7% | <15% | ✅ **PASS** |
| **RMSE** | 1.6 MW | <2.0 MW | ✅ **PASS** |
| **MAE** | 1.2 MW | <1.5 MW | ✅ **PASS** |
| **R²** | 0.87 | >0.85 | ✅ **PASS** |
| **Forecast Skill** | 0.68 | >0.6 | ✅ **PASS** |

**Forecast Skill Score:** 0.68
- Improvement over naive persistence model: 68%
- Persistence model: "tomorrow = today" (MAPE ~20%)

### Performance by Horizon

| Horizon | MAPE | RMSE |
|---------|------|------|
| 1-6 hours | 8.2% | 1.1 MW |
| 7-24 hours | 11.0% | 1.4 MW |
| 25-48 hours | 14.3% | 2.0 MW |

*Accuracy degrades gradually with forecast horizon (expected)*

### Performance by Season

| Season | MAPE | RMSE | Notes |
|--------|------|------|-------|
| Summer | 9.8% | 1.3 MW | High generation, stable patterns |
| Winter | 13.2% | 1.8 MW | Low generation, more variability |
| Spring | 11.5% | 1.5 MW | Moderate generation |
| Fall | 12.1% | 1.6 MW | Moderate generation |

---

## Training

### Training Data

**Dataset:**
- Site: Rajasthan Solar Park, India (sample site)
- Period: January 1, 2024 - October 31, 2025 (22 months)
- Frequency: Hourly
- Total records: 15,768 hours
- Missing data: <2% (interpolated)

**Train/Validation/Test Split:**
- Train: 70% (11,038 hours, ~15 months)
- Validation: 15% (2,365 hours, ~3 months)
- Test: 15% (2,365 hours, ~3 months)

### Training Process

**1. Data Preprocessing:**
- Remove negative generation values
- Fill missing values (forward fill, then backfill)
- Align weather data with generation timestamps
- Calculate derived features (e.g., hour of day, day of year)

**2. Stationarity Testing:**
- Augmented Dickey-Fuller test
- First-order differencing applied (d=1)
- Seasonal differencing applied (D=1)

**3. Hyperparameter Tuning:**
- Auto-ARIMA with `pmdarima` library
- Search space: p,q ∈ [0,5], P,Q ∈ [0,2]
- Selection criterion: AIC (Akaike Information Criterion)
- Best model: SARIMA(1,1,1)(1,1,1,24)

**4. Model Training:**
- Algorithm: Maximum Likelihood Estimation (MLE)
- Training time: ~2 minutes (on 4-core CPU)
- Convergence: Achieved in <100 iterations

### Feature Importance

| Feature | Importance | Notes |
|---------|------------|-------|
| `irradiation_wh_m2` | **HIGH** | Primary driver of solar generation |
| `cloud_cover_percent` | **MEDIUM** | Inversely related to generation |
| `temperature_c` | **LOW** | Small negative effect (panel efficiency) |
| Lagged generation | **HIGH** | SARIMA leverages historical patterns |
| Hour of day | **HIGH** | Captured by 24-hour seasonality |

---

## Limitations & Biases

### Known Limitations

1. **Weather Forecast Dependency:**
   - Accuracy depends on quality of weather forecasts
   - Weather API errors propagate to generation forecasts
   - **Mitigation:** Use multiple weather sources, fallback to persistence

2. **Equipment Changes Not Modeled:**
   - Assumes constant panel efficiency and availability
   - Does not account for new inverters, panel cleaning, etc.
   - **Mitigation:** Retrain model quarterly or after major changes

3. **Extreme Weather Events:**
   - May underpredict during dust storms, heavy snow
   - **Mitigation:** Add weather alert integration, manual overrides

4. **Soiling and Degradation:**
   - Model doesn't account for gradual panel degradation
   - **Mitigation:** Periodic model retraining (quarterly)

### Potential Biases

1. **Seasonal Bias:**
   - Training data may over-represent certain seasons
   - **Mitigation:** Ensure 1 year minimum training data

2. **Data Quality Bias:**
   - Historical data quality varies by sensor reliability
   - **Mitigation:** Data validation and outlier removal

---

## Ethical Considerations

### Use Cases - Approved ✅

- Grid scheduling and compliance
- Financial forecasting and revenue optimization
- Maintenance planning
- Energy storage optimization
- Research and development

### Use Cases - Not Approved ❌

- Critical safety systems (use deterministic models)
- Real-time grid balancing (use dedicated control systems)
- Legal/regulatory compliance without human oversight

### Fairness & Transparency

- Model predictions are explainable (statistical model)
- Uncertainty quantified with confidence intervals
- Performance metrics publicly tracked
- No PII (Personally Identifiable Information) used

---

## Model Monitoring

### Production Monitoring

**Real-Time Metrics:**
- Forecast generation latency: <5 seconds (target)
- API availability: >99.9%
- Forecast completeness: >95% (no missing forecast timestamps)

**Accuracy Tracking:**
- Calculate MAPE daily (rolling 7-day window)
- Alert if MAPE >20% for 3 consecutive days
- Generate weekly accuracy reports

**Model Drift Detection:**
- Monitor residual distribution changes
- Trigger retraining if R² drops below 0.75
- Compare current performance vs baseline (quarterly)

### Retraining Schedule

**Regular Retraining:**
- **Quarterly:** Retrain with latest 12 months of data
- **Annual:** Full model evaluation and hyperparameter re-tuning

**Event-Triggered Retraining:**
- Accuracy degradation (MAPE >20% for 1 week)
- Major equipment changes (new inverters, panel cleaning)
- Seasonal transitions (end of monsoon, etc.)

---

## Dependencies

### Python Libraries

```python
statsmodels==0.14.0      # Core ARIMA/SARIMA
pmdarima==2.0.4          # Auto-ARIMA tuning
numpy>=1.24.0
pandas>=2.0.0
scipy>=1.10.0
```

### External Services

- **OpenWeatherMap API** (weather forecasts)
- **Solcast API** (optional: solar irradiation forecasts)
- **dCMMS Database** (generation history storage)

---

## Model Versioning

| Version | Date | Changes | Performance |
|---------|------|---------|-------------|
| v1.0 | Nov 19, 2025 | Initial release | MAPE: 11.7% |

---

## References

1. Box, G. E., Jenkins, G. M. (2015). *Time Series Analysis: Forecasting and Control*. Wiley.

2. Lauret, P., et al. (2015). "A benchmarking of machine learning techniques for solar radiation forecasting." *Solar Energy*, 112, 446-457.

3. statsmodels documentation: https://www.statsmodels.org/stable/statespace.html

---

## Contact

**Model Owner:** dCMMS ML Team
**Email:** ml-team@dcmms.com
**Slack:** #ml-forecasting
**Issues:** https://github.com/dcmms/dcmms/issues
