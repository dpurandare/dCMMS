#!/usr/bin/env python3
"""
MQTT Telemetry Publisher Example

Publishes simulated sensor telemetry data to EMQX broker.

Usage:
    python mqtt-publisher.py

Requirements:
    pip install paho-mqtt
"""

import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime

# MQTT Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_USERNAME = "sensor01"
MQTT_PASSWORD = "password"

# Site and Asset Configuration
SITE_ID = "site-001"
ASSET_ID = "asset-001"

# Sensor Configuration
SENSORS = [
    {"id": "temp-001", "type": "TEMPERATURE", "unit": "celsius", "min": 60, "max": 85},
    {"id": "volt-001", "type": "VOLTAGE", "unit": "volts", "min": 220, "max": 240},
    {"id": "curr-001", "type": "CURRENT", "unit": "amperes", "min": 10, "max": 20},
    {"id": "power-001", "type": "POWER", "unit": "kilowatts", "min": 2.5, "max": 4.5},
]

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print(f"✓ Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"✗ Failed to connect, return code {rc}")

def on_publish(client, userdata, mid):
    """Callback when message is published"""
    print(f"  Published message ID: {mid}")

def generate_telemetry_event(sensor):
    """Generate a single telemetry event"""
    # Simulate realistic sensor reading with some variation
    base_value = (sensor["min"] + sensor["max"]) / 2
    variation = (sensor["max"] - sensor["min"]) * 0.1
    value = base_value + random.uniform(-variation, variation)

    # Occasionally inject anomalies
    quality_flag = "GOOD"
    if random.random() < 0.02:  # 2% chance of anomaly
        quality_flag = "OUT_OF_RANGE"
        value = sensor["max"] * 1.5  # Spike above normal range

    return {
        "event_id": f"evt-{int(time.time() * 1000)}-{random.randint(1000, 9999)}",
        "timestamp": int(time.time() * 1000),
        "site_id": SITE_ID,
        "asset_id": ASSET_ID,
        "sensor_type": sensor["type"],
        "sensor_id": sensor["id"],
        "value": round(value, 2),
        "unit": sensor["unit"],
        "quality_flag": quality_flag,
        "metadata": {
            "firmware_version": "1.2.3",
            "location": "Building A, Floor 2"
        },
        "source": "MQTT",
        "schema_version": "1.0.0"
    }

def publish_telemetry(client, sensor):
    """Publish telemetry event for a sensor"""
    event = generate_telemetry_event(sensor)

    # MQTT topic: telemetry/{site_id}/{asset_id}/{sensor_type}
    topic = f"telemetry/{SITE_ID}/{ASSET_ID}/{sensor['type']}"

    # Publish with QoS 1 (at least once delivery)
    result = client.publish(topic, json.dumps(event), qos=1)

    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print(f"✓ {sensor['id']}: {event['value']} {event['unit']} (Quality: {event['quality_flag']})")
    else:
        print(f"✗ Failed to publish {sensor['id']}: {result.rc}")

def main():
    """Main function"""
    print("=== dCMMS MQTT Telemetry Publisher ===")
    print("")

    # Create MQTT client
    client = mqtt.Client(client_id=f"publisher-{random.randint(1000, 9999)}")
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_publish = on_publish

    # Connect to broker
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        client.loop_start()

        # Wait for connection
        time.sleep(2)

        print(f"Publishing telemetry for {len(SENSORS)} sensors...")
        print(f"Site: {SITE_ID}, Asset: {ASSET_ID}")
        print("")

        # Publish continuously
        iteration = 1
        while True:
            print(f"--- Iteration {iteration} ({datetime.now().strftime('%H:%M:%S')}) ---")

            # Publish readings for all sensors
            for sensor in SENSORS:
                publish_telemetry(client, sensor)
                time.sleep(0.5)  # Small delay between sensors

            print("")
            iteration += 1

            # Wait before next iteration
            time.sleep(5)  # Publish every 5 seconds

    except KeyboardInterrupt:
        print("\n\nStopping publisher...")
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        print("✓ Disconnected from MQTT broker")

if __name__ == "__main__":
    main()
