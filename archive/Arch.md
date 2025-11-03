# Architecture
![A diagram of a flowchart AI-generated content may be
incorrect.](Arch1.png)

![A colorful rectangular object with text AI-generated content may be
incorrect.](Arch2.png)
**1) Step-by-step architecture**

1.  **Edge & Ingestion**

    -   Devices / SCADA / PLCs speak protocols like OPC-UA, Modbus,
        MQTT, FTP/SFTP.

    -   **Collectors at Edge** (edge gateways) pull/subscribe from
        devices, perform initial filtering and buffering, and publish
        telemetry to the local **MQTT broker
        (EMQX)** using **mTLS** (Vault PKI) or short-lived tokens.

2.  **MQTT → Kafka (ingest into central stream)**

    -   EMQX bridges selected MQTT topics into Kafka (Amazon MSK).

    -   Data is serialized with schemas (Avro / Protobuf) registered in
        a **Schema Registry**. Raw topics hold unprocessed telemetry.

3.  **Real-time stream processing (Flink on EKS)**

    -   **Flink** consumes Kafka raw topics, performs validation,
        enrichment (lookups, geo info, unit conversions), and creates:

        -   \"validated/enriched\" topics for low-latency consumers (API
            / mobile).

        -   \"alarm\" topics for alerts.

        -   Writes streaming outputs to **S3/Iceberg** (Bronze → Silver
            → Gold stages).

4.  **Storage Layer**

    -   **S3 + Iceberg** for data lake (Bronze/Silver/Gold). Iceberg
        gives ACID and table format for reads/writes.

    -   **Analytical RDS** for curated relational data for specific BI
        needs; **Transactional RDS** for OLTP.

    -   Schema Registry holds contract definitions (for Avro/Proto).

5.  **Batch & Orchestration**

    -   **Spark on EKS** runs batch ETL on historical / late arriving
        data (heavy transformations, deduplication).

    -   **Airflow on EKS** orchestrates workflows (daily batch,
        materialize features, reprocessing), handles retries,
        dependencies, SLA.

6.  **Serving & Consumption**

    -   **Trino on EKS** (SQL query engine) exposes Gold Iceberg tables
        for ad-hoc SQL and BI tools.

    -   **Exporters** (REST, MQTT, OPC UA, FTP) and BI tools (Tableau /
        Superset) consume Gold/curated views.

    -   **API Server / Mobile App**: low-latency consumers subscribe to
        Kafka validated topics (WebSocket/SDK) for live alarms and
        current telemetry.

7.  **ML Layer**

    -   Offline store (Feast) uses Iceberg / Parquet for features;
        online store is **Redis** (for fast lookups).

    -   **MLflow** for experiment tracking & model registry.

    -   **KServe** for model serving (K8s native) --- retrieves features
        from online store + returns predictions.

8.  **Supporting Services / Cross-cutting concerns**

    -   Identity & Auth (OIDC/IdP: Okta/Keycloak/Entra), Secrets
        (Vault + KMS). Observability (OpenTelemetry →
        Prometheus/Grafana/Loki). Data lineage (OpenMetadata / Marquez).
        Monitoring & alerting everywhere.

**2) Flow**

Device → edge collector → EMQX (MQTT) → MSK (Kafka raw topic) → Flink
real-time validation → Kafka validated topic + S3 Iceberg Bronze →
nightly Spark cleans Bronze → Silver/Gold → Trino/BI/Feast offline →
Feast materialize → Redis online → MLflow train & KServe serve →
API/Apps use Redis + KServe.

**3) Product features**

**CMS (Central Monitoring System) Scope**

**1. Portfolio-Level Monitoring (Wind + Solar)**

-   **KPIs Across Assets / Regions**

    -   **Installed capacity (MW), Generation (MWh), Availability (%)**

    -   **Capacity factor (CF), Performance ratio (PR), OEE (overall
        equipment effectiveness)**

    -   **Curtailment losses (grid, scheduling, congestion)**

-   **Benchmarking**

    -   **Compare portfolio performance across OEMs, geographies, asset
        ages.**

-   **Alerts & Alarms Overview**

    -   **Centralized event/alarm dashboard.**

-   **Financial KPIs**

    -   **Revenue per plant, PPA compliance, deviation penalties.**

**2. Site-Level Monitoring**

-   **Real-Time SCADA View**

    -   **Current generation, weather conditions (irradiance, wind
        speed).**

-   **Operational KPIs**

    -   **Plant availability, inverter availability, turbine
        availability.**

    -   **Downtime events, fault history.**

-   **Maintenance View**

    -   **Active work orders, MTTR (Mean Time to Repair).**

-   **Soiling & Degradation Monitoring (for solar).**

**3. WMS (Weather Monitoring System)**

-   **Live Weather Data Integration**

    -   **Wind speed/direction, irradiance, temperature, humidity.**

-   **Forecast vs. Actual Comparison**

    -   **Weather forecast accuracy vs. site-measured data.**

-   **Impact Correlation**

    -   **Correlate weather anomalies with generation dips.**

**[Analytics Scope]{.underline}**

**1. Generation Analytics**

-   **Portfolio & Site Generation Trends (daily, monthly, seasonal).**

-   **Forecast vs. Actual Generation Accuracy.**

-   **Generation Benchmarking (per turbine, inverter, string, site).**

-   **Energy Yield Analysis -- MWh per MWp installed.**

**2. Loss Analytics**

-   **Categorization of Losses**

    -   ***Resource losses*: irradiation/wind speed below expected.**

    -   ***Technical losses*: inverter/tracker/turbine faults, grid
        trips.**

    -   ***Non-technical losses*: curtailment, scheduling errors, grid
        restrictions.**

-   **Downtime Breakdown (planned vs. unplanned).**

-   **Loss Attribution Dashboard (per site, per OEM, per device).**

-   **Cost of Losses (impact on revenue).**

**3. Inverter Analytics (Solar-Specific)**

-   **Inverter Performance Ratio (PR).**

-   **Efficiency Deviation across inverters.**

-   **DC/AC Ratio & Clipping Analysis.**

-   **String-Level Fault Detection (string mismatch,
    underperformance).**

-   **Thermal Behaviour (temperature vs. efficiency).**

-   **Failure Rate Analytics (MTBF, MTTR).**

**4. Turbine Analytics (Wind)**

-   **Component-level fault trends (gearbox, generator, blades).**

-   **Pitch/yaw system efficiency.**

-   **Wind turbine wake-effect analysis.**

**5. BESS Analytics**

-   **SOC (State of Charge) & SOH (State of Health).**

-   **Round-trip efficiency.**

-   **Degradation prediction.**

**6. Hydrogen Analytics**

-   **Electrolyzer efficiency (kWh/kg H₂).**

-   **Compressor utilization.**

-   **Storage vs. dispatch optimization.**

**7. Thermography Analytics**

-   **Solar:**

    -   **Hotspot detection (modules, strings, combiner boxes).**

    -   **PID (Potential Induced Degradation) identification.**

    -   **Tracker misalignment via heat signatures.**

-   **Wind:**

    -   **Bearing/gearbox overheating detection.**

    -   **Generator stator temperature anomalies.**

    -   **Blade surface cracks & lightning strike damage (via IR + RGB
        fusion).**

-   **BESS:**

    -   **Cell/module overheating, thermal runaway risk prediction.**

    -   **Battery cabinet airflow efficiency.**

-   **Hydrogen:**

    -   **Leak detection via thermal signature + gas sensors.**

    -   **Compressor overheating monitoring.**

-   **Integration Layer:**

    -   **Drone & handheld thermography images ingested → AI/ML detects
        anomalies → Insights flow into Fault Dashboard & CMMS
        (auto-create work orders).**

**[Dashboards]{.underline}**

**1. Operational Dashboard**

-   **Real-Time Plant View**

    -   Current generation vs forecast.

    -   Plant availability, turbine/inverter availability.

    -   Weather conditions (wind, irradiance, temperature, humidity).

-   **KPI Tiles**

    -   Capacity factor, performance ratio (PR), grid availability.

    -   Curtailment %, revenue impact.

-   **Portfolio Overview**

    -   Comparison across sites, OEMs, regions.

-   **Alerts & Notifications**

    -   Critical vs non-critical alarms.

**2. Fault Dashboard**

-   **Fault Statistics**

    -   Open vs resolved faults.

    -   Fault frequency distribution (Pareto / 80:20 analysis → focus on
        top recurring faults).

-   **Reliability Metrics**

    -   **MTTR** (Mean Time to Repair).

    -   **MTBF** (Mean Time Between Failures).

-   **Fault Categorization**

    -   Electrical, mechanical, communication, weather-related.

-   **Trend Analysis**

    -   Fault recurrence trends by device, OEM, site.

-   **Root Cause Drill-Down**

    -   Device → Fault type → Resolution history.

**3. CMMS Dashboard (Computerized Maintenance Management System)**

-   **Work Orders**

    -   Active, completed, overdue.

    -   Preventive vs corrective maintenance ratio.

-   **Technician Productivity**

    -   Avg. resolution time, workload distribution.

-   **Asset Health**

    -   Asset-wise downtime, maintenance frequency.

    -   Spare part consumption / stock alerts.

-   **O&M Cost Analytics**

    -   Cost per MW, per fault, per component.

-   **Maintenance KPIs**

    -   SLA compliance, % preventive vs reactive jobs.

**[GenAI Use Cases for Renewable Assets (Wind \| Solar \| BESS \|
Hydrogen)]{.underline}**

**1. Natural Language Analytics (Chat with Data)**

-   **What it is:** Business/operations users query data in plain
    English.

-   **Example Questions:**

    -   "Show me yesterday's machine downtime by plant."

    -   "Which inverter has the lowest efficiency this month?"

    -   "Summarize top 5 recurring turbine faults across portfolio."

-   **Value:** Democratizes access to analytics → no need for SQL or BI
    expertise.

**2. Automated Insights & Summarization**

-   **Daily Ops Report Generation**

    -   Auto-generate daily/weekly performance reports with highlights:
        generation, losses, downtime.

-   **Root Cause Summaries**

    -   GenAI clusters alarms/fault logs → produces natural language
        summary of probable causes.

-   **Management Briefs**

    -   "In the last week, wind portfolio underperformed by 4% due to
        grid curtailments at 2 sites."

**3. Predictive Maintenance Copilot**

-   **Chatbot for Engineers/Technicians**

    -   Ask: "What's the history of faults for turbine T-103?"

    -   Ask: "What spare part is usually needed for inverter model X
        fault code Y?"

-   **Knowledge Base Integration**

    -   Uses OEM manuals, past tickets, CMMS history → suggests fixes.

-   **Impact Forecasting**

    -   Predicts downtime risk if issue not resolved.

**4. Scenario Simulation & Forecasting**

-   **What-if Analysis**

    -   "If irradiation is 10% lower tomorrow, what's the expected solar
        output?"

    -   "If 2 turbines are offline at 15 MW site, how does it impact
        capacity factor?"

-   **Revenue / PPA Risk Simulations**

    -   Natural language queries for contractual compliance, deviation
        penalties.

**5. GenAI-driven Document Intelligence**

-   **Smart Search across Docs**

    -   Policies, PPA contracts, HSE manuals, OEM service manuals.

    -   "What are the warranty terms for inverter model XYZ?"

-   **Automated Compliance Checks**

    -   Summarize ISO/CEA audit compliance gaps from uploaded documents.

-   **HSE Incident Report Analysis**

    -   GenAI reads past incident reports, identifies patterns.

**6. Control Room Copilot (Virtual Operator Assistant)**

-   **Real-time conversational assistant** in NOC / Control Room.

-   Alerts contextualized in natural language:

    -   "Site A is down by 12% compared to expected due to 2 inverter
        trips."

-   Recommends immediate actions based on standard O&M playbooks.

> **[Asset Management]{.underline}**

**ML Use Cases**

-   **Asset Health Scoring**

    -   ML models combine SCADA data, inspections, and historical
        failures to assign a "health index" for transformers, breakers,
        turbines, etc.

-   **Remaining Useful Life (RUL) Prediction**

    -   Forecast end-of-life for critical assets based on stress,
        environment, and usage.

-   **Spare Parts Demand Forecasting**

    -   Predict demand for spare parts (bearings, insulators,
        transformers) to optimize inventory.

**GenAI Use Cases**

-   **Digital Twin Reports**

    -   Generate natural language summaries of an asset's
        condition: *"Transformer T-202 is showing 8% insulation
        degradation; expected service needed in 6 months."*

-   **Smart Document Search**

    -   Engineers can ask: *"Show me past failure reports for 220kV GIS
        switchgear"*.

-   **Automated Compliance Filing**

    -   GenAI drafts compliance reports on asset inspections for
        regulators.

**Analytical Use Cases**

-   **Asset Lifecycle Analytics**

    -   Track CapEx vs. OpEx, depreciation, and failure rates.

-   **Utilization Dashboards**

    -   Measure how efficiently generators, transformers, or feeders are
        used.

-   **Condition-Based Replacement**

    -   Analytics showing which assets should be replaced vs. repaired.

> **[Field Operations]{.underline}**

**ML Use Cases**

-   **Workforce Routing Optimization**

    -   ML recommends the most efficient routing for field crews during
        outages or inspections.

-   **Safety Risk Prediction**

    -   Predict high-risk jobs based on historical incidents, weather,
        and equipment type.

-   **Drone Image Analysis**

    -   Detect cracks, corrosion, vegetation encroachment from
        drone-captured images.

**GenAI Use Cases**

-   **Field Engineer Copilot**

    -   Mobile assistant that provides troubleshooting steps: *"If
        breaker trips due to overcurrent, check relay settings first."*

-   **Incident Auto-Documentation**

    -   After an outage, GenAI generates a field report summarizing
        photos, SCADA data, and crew notes.

-   **Knowledge Transfer**

    -   Junior engineers can query GenAI trained on OEM manuals and
        senior engineer notes.

**Analytical Use Cases**

-   **Crew Productivity Dashboards**

    -   Track average repair times, jobs per day, SLA adherence.

-   **Geospatial Analytics**

    -   Map of outages, work orders, and crew movement.

-   **Work Order Cost Analysis**

    -   Track average cost per outage restoration or maintenance job.

> **[Predictive Maintenance]{.underline}**

**ML Use Cases**

-   **Failure Prediction Models**

    -   Predict transformer winding failures, turbine bearing wear, or
        cable insulation breakdown before they happen.

-   **Vibration/Temperature Monitoring**

    -   ML models detect abnormal vibration in turbines, pumps, or
        rotating equipment.

-   **Dynamic Maintenance Scheduling**

    -   Instead of fixed schedules, ML suggests *"Inspect transformer X
        now, defer transformer Y by 3 months."*

**GenAI Use Cases**

-   **Failure Cause Explanation**

    -   *"Based on historical data, the most likely cause of this fault
        is partial discharge due to insulation aging."*

-   **Maintenance Planner Assistant**

    -   Generate optimized maintenance schedules from asset health data.

-   **Failure Playbooks**

    -   Auto-generate troubleshooting steps for detected anomalies.

**Analytical Use Cases**

-   **MTBF/MTTR Tracking**

    -   Mean Time Between Failures & Mean Time To Repair dashboards.

-   **Cost-Benefit Analytics**

    -   Compare cost of predictive vs. reactive maintenance.

-   **Downtime Avoidance Reports**

    -   Estimate how much downtime/cost was saved by predictive
        interventions.
