# Wind Farm Management Guide

## Overview

The Wind Farm Management module provides specialized tools for monitoring and maintaining wind energy assets. It includes dedicated asset types, telemetry visualization, and maintenance templates tailored for wind turbines.

## Wind Dashboard

Access the Wind Dashboard via **Dashboards > Wind Farm** in the main navigation.

### Key Features
- **Turbine Health Heatmap**: A grid view of all turbines color-coded by status (Operational, Warning, Critical, Maintenance). Hover over a cell to see real-time power and wind speed.
- **Power Curve Correlation**: A scatter plot showing Actual Power vs. Wind Speed compared to the Theoretical Power Curve. This helps identify underperforming turbines (e.g., due to blade icing or yaw misalignment).
- **Key Metrics**: Real-time view of Total Generation, Average Wind Speed, and Fleet Availability.

## Managing Wind Assets

### Creating a Wind Turbine
1. Go to **Assets > Inventory**.
2. Click **Add Asset**.
3. Select **Type**: `WIND_TURBINE`.
4. Enter the **Asset Tag** (e.g., `WT-001`).
5. Fill in the **Specifications**:
    - **Rated Power**: e.g., 2000 kW
    - **Rotor Diameter**: e.g., 90 m
    - **Hub Height**: e.g., 80 m
    - **Cut-in/Cut-out Speed**: e.g., 3 m/s / 25 m/s

### Telemetry Configuration
Wind turbines support the following telemetry points:
- `wind_speed_ms`: Anemometer reading
- `power_output_kw`: Active power
- `rotor_speed_rpm`: Rotor speed
- `blade_pitch_angle_deg`: Blade pitch

## Maintenance Templates

Pre-configured work order templates are available for common wind maintenance tasks:

- **Blade Inspection**: Visual inspection for cracks, erosion, or lightning damage.
- **Gearbox Oil Change**: Routine oil replacement and filter change.
- **Yaw System Maintenance**: Inspection of yaw motors, brakes, and gears.
- **Generator Inspection**: Electrical and mechanical check of the generator.

To use a template:
1. Go to **Work Orders > Create**.
2. Select the **Wind Turbine** asset.
3. Choose the appropriate **Template** from the dropdown.
