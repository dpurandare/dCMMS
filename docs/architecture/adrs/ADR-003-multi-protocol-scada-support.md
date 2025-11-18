# ADR-003: Multi-Protocol SCADA Integration

**Status:** Accepted
**Date:** 2025-11-18
**Decision Makers:** Integration Architecture Team, Backend Team, Product Management
**Related:** Spec 10 (Data Ingestion), Spec 12 (Integration Specifications), Spec 21 (Edge Computing)

---

## Context

Renewable energy facilities use diverse SCADA (Supervisory Control and Data Acquisition) systems with different communication protocols:

- **Solar Plants:** Primarily OPC-UA, Modbus TCP/RTU
- **Wind Farms:** IEC 61400-25, Modbus TCP, DNP3
- **Hydroelectric:** IEC 61850, DNP3, Modbus
- **Legacy Systems:** Proprietary protocols, BACnet

### Requirements

1. **Protocol Diversity:** Support 4+ standard industrial protocols from day one
2. **Data Rate:** 72,000 events/second aggregate from all sites
3. **Real-Time:** <100ms latency from SCADA to dCMMS ingestion
4. **Reliability:** No data loss during network interruptions (edge buffering)
5. **Scalability:** Add new protocols without re-architecting
6. **Edge Processing:** Protocol translation at edge (not cloud)

### Decision Drivers

1. **Customer Requirements:** Different sites have different SCADA vendors
2. **Industry Standards:** Must support IEC 61850, IEC 61400-25, DNP3, Modbus
3. **Operational Continuity:** Cannot replace existing SCADA systems
4. **Edge Computing:** Protocol complexity handled locally, not in cloud
5. **Vendor Independence:** Avoid dependency on single SCADA vendor

---

## Decision

We will implement a **Multi-Protocol Gateway Architecture** at the edge, with protocol-specific adapters that normalize data into a common internal format before transmission to the cloud.

### Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          RENEWABLE ENERGY SITE                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       SCADA/DCS Systems                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │   │
│  │  │ Inverters  │  │ Weather    │  │ Transformers│  │ Switchgear  │  │   │
│  │  │ (Modbus)   │  │ (OPC-UA)   │  │ (IEC 61850) │  │ (DNP3)      │  │   │
│  │  └─────┬──────┘  └──────┬─────┘  └──────┬─────┘  └──────┬──────┘  │   │
│  └────────┼─────────────────┼────────────────┼───────────────┼─────────┘   │
│           │                 │                │               │              │
│  ┌────────▼─────────────────▼────────────────▼───────────────▼─────────┐   │
│  │                  EDGE GATEWAY (K3s Cluster)                          │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │            Protocol Adapter Layer                             │  │   │
│  │  │  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐  │  │   │
│  │  │  │  Modbus   │ │  OPC-UA   │ │ IEC 61850  │ │    DNP3    │  │  │   │
│  │  │  │  Adapter  │ │  Adapter  │ │  Adapter   │ │  Adapter   │  │  │   │
│  │  │  └─────┬─────┘ └─────┬─────┘ └─────┬──────┘ └─────┬──────┘  │  │   │
│  │  └────────┼──────────────┼──────────────┼──────────────┼─────────┘  │   │
│  │  ┌────────▼──────────────▼──────────────▼──────────────▼─────────┐  │   │
│  │  │            Data Normalization Layer                            │  │   │
│  │  │  - Convert to common schema (Avro/Protobuf)                   │  │   │
│  │  │  - Add metadata (timestamp, quality, source)                  │  │   │
│  │  │  - Apply calibration/scaling                                  │  │   │
│  │  └────────┬───────────────────────────────────────────────────────┘  │   │
│  │  ┌────────▼───────────────────────────────────────────────────────┐  │   │
│  │  │            Local Processing & Buffering                        │  │   │
│  │  │  - MQTT Broker (EMQX)                                          │  │   │
│  │  │  - QuestDB (24-hour local buffer)                             │  │   │
│  │  │  - Local alerting (critical faults)                           │  │   │
│  │  └────────┬───────────────────────────────────────────────────────┘  │   │
│  └───────────┼──────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              │ MQTT over TLS (compressed)                                   │
│              │                                                               │
└──────────────┼───────────────────────────────────────────────────────────────┘
               │
               │ Internet / VPN
               │
┌──────────────▼───────────────────────────────────────────────────────────────┐
│                            CLOUD (dCMMS Platform)                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  MQTT Broker (EMQX Cluster)                                          │   │
│  │    └──▶ Kafka (Telemetry Topic)                                      │   │
│  │          └──▶ Flink (Stream Processing)                              │   │
│  │                └──▶ QuestDB (Raw Telemetry)                          │   │
│  │                └──▶ TimescaleDB (Aggregates)                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Protocol Adapter Interface

```typescript
/**
 * Common interface for all SCADA protocol adapters
 */
export interface ISCADAProtocolAdapter {
  /**
   * Connect to SCADA system
   */
  connect(config: ProtocolConfig): Promise<void>;

  /**
   * Disconnect from SCADA system
   */
  disconnect(): Promise<void>;

  /**
   * Subscribe to data points (tags)
   */
  subscribe(tags: string[]): Promise<void>;

  /**
   * Read data points on-demand (polling)
   */
  read(tags: string[]): Promise<DataPoint[]>;

  /**
   * Write control commands (for future use)
   */
  write(tag: string, value: any): Promise<void>;

  /**
   * Get adapter status (connected, error, etc.)
   */
  getStatus(): AdapterStatus;

  /**
   * Get supported data types for this protocol
   */
  getSupportedDataTypes(): string[];
}

export interface ProtocolConfig {
  protocol: 'modbus' | 'opcua' | 'iec61850' | 'dnp3' | 'bacnet';
  host: string;
  port: number;

  // Protocol-specific configuration
  modbusConfig?: {
    unitId: number;
    timeout: number;
    retries: number;
  };
  opcuaConfig?: {
    endpoint: string;
    securityMode: string;
    securityPolicy: string;
    username?: string;
    password?: string;
  };
  iec61850Config?: {
    iedName: string;
    accessPoint: string;
  };
  dnp3Config?: {
    masterAddress: number;
    outstationAddress: number;
  };
}

export interface DataPoint {
  tag: string;              // Unique identifier (e.g., "INV-01.Power")
  value: number | boolean | string;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: Date;          // SCADA timestamp
  ingestedAt: Date;         // Edge gateway timestamp
  source: {
    protocol: string;
    device: string;
    address: string;
  };
  metadata?: {
    unit?: string;          // e.g., "kW", "V", "A"
    min?: number;
    max?: number;
    scaleFactor?: number;
  };
}

export interface AdapterStatus {
  connected: boolean;
  lastSuccessfulRead: Date;
  errorCount: number;
  lastError?: Error;
}
```

### Data Normalization Schema (Avro)

```json
{
  "type": "record",
  "name": "TelemetryEvent",
  "namespace": "com.dcmms.telemetry",
  "fields": [
    {"name": "event_id", "type": "string"},
    {"name": "site_id", "type": "string"},
    {"name": "asset_id", "type": "string"},
    {"name": "tag", "type": "string"},
    {"name": "value", "type": ["double", "boolean", "string"]},
    {"name": "quality", "type": {"type": "enum", "name": "Quality", "symbols": ["GOOD", "BAD", "UNCERTAIN"]}},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
    {"name": "ingested_at", "type": "long", "logicalType": "timestamp-millis"},
    {
      "name": "source",
      "type": {
        "type": "record",
        "name": "Source",
        "fields": [
          {"name": "protocol", "type": "string"},
          {"name": "device", "type": "string"},
          {"name": "address", "type": "string"}
        ]
      }
    },
    {
      "name": "metadata",
      "type": ["null", {
        "type": "record",
        "name": "Metadata",
        "fields": [
          {"name": "unit", "type": ["null", "string"], "default": null},
          {"name": "min", "type": ["null", "double"], "default": null},
          {"name": "max", "type": ["null", "double"], "default": null},
          {"name": "scale_factor", "type": ["null", "double"], "default": null}
        ]
      }],
      "default": null
    }
  ]
}
```

---

## Protocol Coverage

### Priority 0 (MVP - Week 14)
**Not Required for MVP** - MVP uses simulated/mock data

### Priority 1 (Release 1 - Week 26)

#### 1. **Modbus TCP/RTU**
- **Use Case:** Most common in solar inverters, energy meters
- **Library:** `modbus-serial` (Node.js), `pyModbus` (Python)
- **Supported Functions:** Read Holding Registers (FC03), Read Input Registers (FC04)
- **Deployment:** ~60% of customer sites

#### 2. **OPC-UA (Unified Architecture)**
- **Use Case:** Modern SCADA, weather stations, PLCs
- **Library:** `node-opcua` (Node.js), `asyncua` (Python)
- **Features:** Subscription-based (not polling), built-in security
- **Deployment:** ~40% of customer sites

### Priority 2 (Release 2 - Week 40)

#### 3. **IEC 61850 (Substation Automation)**
- **Use Case:** Electrical substations, protection relays, transformers
- **Library:** `libiec61850` (C library, Node.js bindings)
- **Complexity:** High (MMS protocol, complex data models)
- **Deployment:** ~20% of customer sites (hydro, wind)

#### 4. **DNP3 (Distributed Network Protocol)**
- **Use Case:** Legacy SCADA in utilities, hydro plants
- **Library:** `opendnp3` (C++ library, Python bindings)
- **Features:** Master/outstation architecture
- **Deployment:** ~15% of customer sites (legacy systems)

### Priority 3 (Future)

#### 5. **BACnet (Building Automation)**
- **Use Case:** HVAC, building management in control rooms
- **Library:** `node-bacnet` (Node.js), `BAC0` (Python)
- **Deployment:** <10% (ancillary systems only)

#### 6. **MQTT (Direct)**
- **Use Case:** IoT sensors, modern edge devices
- **Deployment:** Growing (new installations)

---

## Implementation Strategy

### Edge Gateway Deployment (K3s)

```yaml
# K3s deployment manifest for protocol adapters
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scada-gateway
spec:
  replicas: 1  # Single instance per site (stateful)
  selector:
    matchLabels:
      app: scada-gateway
  template:
    metadata:
      labels:
        app: scada-gateway
    spec:
      containers:
      - name: modbus-adapter
        image: dcmms/modbus-adapter:v1.0
        env:
        - name: SITE_ID
          value: "SITE-001"
        - name: MQTT_BROKER
          value: "emqx:1883"
        volumeMounts:
        - name: config
          mountPath: /config
      - name: opcua-adapter
        image: dcmms/opcua-adapter:v1.0
        # ...similar configuration
      volumes:
      - name: config
        configMap:
          name: scada-config
```

### Configuration (per site)

```yaml
# ConfigMap: scada-config
apiVersion: v1
kind: ConfigMap
metadata:
  name: scada-config
data:
  devices.yaml: |
    site_id: SITE-001
    devices:
      - name: "Inverter-01"
        protocol: modbus
        host: "192.168.1.10"
        port: 502
        unitId: 1
        poll_interval: 5000  # 5 seconds
        tags:
          - name: "INV-01.Power"
            address: 40001
            dataType: "float32"
            unit: "kW"
            scaleFactor: 0.1
          - name: "INV-01.Voltage"
            address: 40003
            dataType: "float32"
            unit: "V"

      - name: "Weather-Station"
        protocol: opcua
        endpoint: "opc.tcp://192.168.1.20:4840"
        securityMode: "None"
        poll_interval: 10000  # 10 seconds
        tags:
          - name: "WX.Temperature"
            nodeId: "ns=2;s=Temperature"
            unit: "°C"
          - name: "WX.Irradiance"
            nodeId: "ns=2;s=GHI"
            unit: "W/m²"
```

---

## Consequences

### Positive

1. **Protocol Flexibility:** Support any industrial protocol
2. **Vendor Independence:** Not tied to specific SCADA vendor
3. **Edge Processing:** Reduces cloud bandwidth and latency
4. **Offline Resilience:** 24-hour local buffering at edge
5. **Normalized Data:** Consistent schema in cloud (easier analytics)
6. **Scalability:** Add new protocols without changing cloud architecture

### Negative

1. **Edge Complexity:** More complex edge deployments (K3s + adapters)
2. **Adapter Maintenance:** Must maintain multiple protocol libraries
3. **Testing:** Each protocol requires hardware/simulators for testing
4. **Configuration:** More configuration per site (device mapping)
5. **Troubleshooting:** Network issues harder to diagnose remotely

### Neutral

1. **Library Dependencies:** Rely on open-source protocol libraries
2. **Security:** Each protocol has different security capabilities
3. **Performance:** Polling-based protocols (Modbus) vs subscription (OPC-UA)

---

## Compliance

This decision aligns with:
- **Spec 10 (Data Ingestion):** 72K events/sec, multi-protocol support
- **Spec 12 (Integration Specifications):** SCADA integration requirements
- **Spec 21 (Edge Computing):** Edge gateway architecture, local buffering
- **STAKEHOLDER_DECISIONS.md:** Multi-protocol SCADA from start

---

## Security Considerations

1. **Network Segmentation:**
   - SCADA network (OT) isolated from IT network
   - Edge gateway acts as one-way data diode (read-only)
   - No direct cloud → SCADA communication

2. **Protocol Security:**
   - OPC-UA: Use `SignAndEncrypt` mode in production
   - Modbus: VPN or dedicated network (no native security)
   - IEC 61850: TLS if supported by devices
   - DNP3: DNP3-SA (Secure Authentication) if available

3. **Edge Gateway:**
   - Encrypted MQTT (TLS 1.3) to cloud
   - Certificate-based authentication
   - Regular security updates (automated)

4. **Access Control:**
   - Read-only access to SCADA (no control commands in MVP)
   - Audit log of all SCADA connections
   - Alerts on connection failures

---

## Testing Strategy

1. **Protocol Simulators:**
   - Modbus: `pyModbusTCP` simulator
   - OPC-UA: `prosys-opc-ua-simulation-server`
   - IEC 61850: `libiec61850` test tools
   - DNP3: `opendnp3` simulator

2. **Integration Tests:**
   - Connect to simulators in CI/CD
   - Verify data normalization
   - Test error handling (disconnects, bad data)

3. **Load Tests:**
   - 1,000 tags polled at 5-second intervals = 200 reads/sec
   - Verify 72K events/sec aggregate across all sites

4. **Edge Tests:**
   - Network interruption (verify 24-hour buffer)
   - Edge restart (verify recovery)
   - Protocol failover

---

## Alternatives Considered

### Alternative 1: Cloud-Based Protocol Gateways
**Rejected:** Requires exposing SCADA to internet, security risk

### Alternative 2: OPC-UA Only
**Rejected:** Many legacy systems don't support OPC-UA

### Alternative 3: Third-Party Gateway (Kepware, Ignition)
**Rejected:** High licensing costs, vendor lock-in

### Alternative 4: Direct Kafka Producers at Edge
**Rejected:** Too complex for edge devices, harder to manage

---

## References

- [OPC UA Specification](https://opcfoundation.org/developer-tools/specifications-unified-architecture)
- [Modbus Protocol](https://modbus.org/specs.php)
- [IEC 61850 Standard](https://webstore.iec.ch/publication/6028)
- [DNP3 Protocol](https://www.dnp.org/)
- Spec 10: Data Ingestion Architecture
- Spec 12: Integration Specifications
- Spec 21: Edge Computing
- STAKEHOLDER_DECISIONS.md - Nov 15, 2025

---

**Last Updated:** 2025-11-18
**Review Date:** 2026-02-18 (3 months)
**Status:** ✅ Accepted
