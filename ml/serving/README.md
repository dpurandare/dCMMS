# Model Serving Infrastructure

Production model serving with KServe compatibility and local development support.

## Overview

This directory contains model serving infrastructure that works in two modes:

1. **Local Development**: Flask-based model server for local testing
2. **Production**: KServe InferenceService on Kubernetes

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Load Balancer  │  (Kubernetes Ingress or local)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Model Server(s) │  (Auto-scaling: 1-5 replicas)
│  - Flask (local)│
│  - KServe (prod)│
└──────┬──────────┘
       │
       ├─── MLflow (model loading)
       ├─── Feast (feature retrieval)
       └─── Prometheus (metrics)
```

## Local Development

### Start Model Server

```bash
cd /home/user/dCMMS/ml/serving

# Start server with Production model
python model_server.py \
  --model-uri "models:/predictive_maintenance_best/Production" \
  --model-name "predictive_maintenance" \
  --model-version "1.0" \
  --host 0.0.0.0 \
  --port 8080
```

### Test Endpoints

```bash
# Health check (liveness)
curl http://localhost:8080/health

# Readiness check
curl http://localhost:8080/ready

# Model metadata
curl http://localhost:8080/v1/models/predictive_maintenance

# Make prediction
curl -X POST http://localhost:8080/v1/models/predictive_maintenance:predict \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      [75.3, 24, 0.15, 0.65, 0.8, 2.5, 1, 0, 0, 0],
      [60.2, 36, 0.25, 0.45, 1.2, 5.0, 0, 1, 1, 1]
    ]
  }'

# Response:
# {
#   "predictions": [0, 1],
#   "probabilities": [[0.75, 0.25], [0.35, 0.65]],
#   "model_name": "predictive_maintenance",
#   "model_version": "1.0"
# }

# Prometheus metrics
curl http://localhost:8080/metrics
```

## KServe Deployment (Production)

### Prerequisites

- Kubernetes cluster (1.21+)
- KServe installed (v0.10+)
- kubectl configured
- MLflow tracking server accessible from cluster
- S3/GCS bucket for model artifacts (or local storage)

### Deploy InferenceService

```bash
# Create namespace
kubectl create namespace dcmms-ml

# Deploy MLflow model to KServe
kubectl apply -f kserve/inference-service.yaml

# Check deployment status
kubectl get inferenceservice -n dcmms-ml

# Watch pods
kubectl get pods -n dcmms-ml -w

# Check logs
kubectl logs -n dcmms-ml -l serving.kserve.io/inferenceservice=predictive-maintenance-model
```

### Update Model Version

```bash
# Edit InferenceService
kubectl edit inferenceservice predictive-maintenance-model -n dcmms-ml

# Update MODEL_VERSION environment variable
# Example: change "Production" to "2" or new version tag

# Changes will trigger rolling update
```

### Canary Deployment

```bash
# Deploy canary (10% traffic to new version)
kubectl patch inferenceservice predictive-maintenance-model -n dcmms-ml --type='json' \
  -p='[{"op": "add", "path": "/spec/canaryTrafficPercent", "value": 10}]'

# Monitor canary performance
# If successful, promote to 100%
kubectl patch inferenceservice predictive-maintenance-model -n dcmms-ml --type='json' \
  -p='[{"op": "replace", "path": "/spec/canaryTrafficPercent", "value": 100}]'

# If issues, rollback (remove canary)
kubectl patch inferenceservice predictive-maintenance-model -n dcmms-ml --type='json' \
  -p='[{"op": "remove", "path": "/spec/canaryTrafficPercent"}]'
```

### Auto-Scaling

Auto-scaling is configured via:
- **Min replicas**: 1
- **Max replicas**: 5
- **Target**: 70% CPU or 100 RPS per pod

Monitor auto-scaling:
```bash
kubectl get hpa -n dcmms-ml
kubectl describe hpa predictive-maintenance-model-hpa -n dcmms-ml
```

## API Endpoints

### KServe-Compatible Endpoints

#### Prediction

```http
POST /v1/models/{model_name}:predict
Content-Type: application/json

{
  "instances": [
    [feature1, feature2, ..., featureN],
    [feature1, feature2, ..., featureN]
  ]
}
```

**Response:**
```json
{
  "predictions": [0, 1],
  "probabilities": [[0.75, 0.25], [0.35, 0.65]],
  "model_name": "predictive_maintenance",
  "model_version": "1.0"
}
```

#### Model Metadata

```http
GET /v1/models/{model_name}
```

**Response:**
```json
{
  "name": "predictive_maintenance",
  "version": "1.0",
  "platform": "mlflow",
  "ready": true
}
```

### Health Checks

#### Liveness Probe

```http
GET /health/live
```

Returns 200 if server is alive, 503 if unhealthy.

#### Readiness Probe

```http
GET /health/ready
```

Returns 200 if model is loaded and ready, 503 otherwise.

### Metrics

#### Prometheus Metrics

```http
GET /metrics
```

**Available Metrics:**
- `model_predictions_total{model_name, model_version}`: Total predictions
- `model_prediction_latency_seconds{model_name, model_version}`: Prediction latency histogram
- `model_prediction_errors_total{model_name, model_version, error_type}`: Prediction errors
- `model_loaded{model_name, model_version}`: Model loaded status (1=loaded, 0=not loaded)

## Monitoring

### Prometheus Queries

```promql
# Request rate
rate(model_predictions_total[5m])

# P95 latency
histogram_quantile(0.95, rate(model_prediction_latency_seconds_bucket[5m]))

# Error rate
rate(model_prediction_errors_total[5m])

# Model availability
model_loaded
```

### Grafana Dashboard

Create dashboard with panels:
1. **Request Rate**: `rate(model_predictions_total[5m])`
2. **Latency (P50, P95, P99)**: Percentiles of `model_prediction_latency_seconds`
3. **Error Rate**: `rate(model_prediction_errors_total[5m]) / rate(model_predictions_total[5m])`
4. **Pod Count**: `count(kube_pod_info{namespace="dcmms-ml"})`

## Performance

### Latency Targets

- **P50**: <100ms
- **P95**: <500ms
- **P99**: <1s

### Throughput

- **Single pod**: ~100 RPS
- **Cluster (5 pods)**: ~500 RPS

### Load Testing

```bash
# Install hey (HTTP load generator)
go install github.com/rakyll/hey@latest

# Run load test: 1000 requests, 50 concurrent
hey -n 1000 -c 50 -m POST \
  -H "Content-Type: application/json" \
  -d '{"instances": [[75.3, 24, 0.15, 0.65, 0.8, 2.5, 1, 0, 0, 0]]}' \
  http://localhost:8080/v1/models/predictive_maintenance:predict
```

## Troubleshooting

### Model not loading

```bash
# Check logs
kubectl logs -n dcmms-ml -l serving.kserve.io/inferenceservice=predictive-maintenance-model

# Common issues:
# - MLflow tracking URI not accessible
# - Model URI incorrect
# - S3/GCS credentials missing
# - Insufficient resources (CPU/memory)
```

### High latency

```bash
# Check resource usage
kubectl top pods -n dcmms-ml

# Check HPA status
kubectl describe hpa predictive-maintenance-model-hpa -n dcmms-ml

# Scale manually if needed
kubectl scale deployment predictive-maintenance-model-predictor -n dcmms-ml --replicas=3
```

### Predictions failing

```bash
# Check model health
curl http://localhost:8080/health/live

# Check model readiness
curl http://localhost:8080/ready

# Check logs for errors
kubectl logs -n dcmms-ml -l serving.kserve.io/inferenceservice=predictive-maintenance-model --tail=100
```

## Security

### Authentication

Add authentication to InferenceService:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  annotations:
    # Require authentication
    serving.knative.dev/ingress.class: "istio"
spec:
  predictor:
    # ... predictor config
    serviceAccountName: ml-serving-sa  # ServiceAccount with appropriate permissions
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ml-serving-policy
  namespace: dcmms-ml
spec:
  podSelector:
    matchLabels:
      serving.kserve.io/inferenceservice: predictive-maintenance-model
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: dcmms-backend  # Only allow traffic from backend namespace
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: mlflow  # Allow egress to MLflow
      ports:
        - protocol: TCP
          port: 5000
```

## Best Practices

1. **Version Models**: Always use versioned models (not "latest")
2. **Monitor Metrics**: Track latency, error rate, throughput
3. **Set Resource Limits**: Prevent resource exhaustion
4. **Use Health Checks**: Enable Kubernetes to auto-restart unhealthy pods
5. **Enable Auto-Scaling**: Handle traffic spikes automatically
6. **Test Canary Deployments**: Validate new models before full rollout
7. **Log Predictions**: For drift monitoring and debugging
8. **Cache Models**: Avoid reloading models on every request
9. **Rate Limiting**: Prevent abuse and ensure fair usage
10. **Backup Models**: Keep previous versions for rollback

## References

- [KServe Documentation](https://kserve.github.io/website/)
- [MLflow Model Serving](https://mlflow.org/docs/latest/models.html#deploy-mlflow-models)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Prometheus Monitoring](https://prometheus.io/docs/introduction/overview/)
