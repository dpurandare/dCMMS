#!/usr/bin/env python3
"""
Time-Series Aggregation Job (DCMMS-059)

Computes pre-aggregated time-series data for fast queries.

Aggregation Levels:
- 1 minute: Every 1 minute (last 5 minutes of raw data)
- 5 minutes: Every 5 minutes (from 1min aggregations)
- 15 minutes: Every 15 minutes (from 5min aggregations)
- 1 hour: Every hour (from 15min aggregations)

Usage:
    # Run all aggregations
    python compute_aggregations.py --all

    # Run specific level
    python compute_aggregations.py --level 1min

    # Run as cron job (every minute)
    * * * * * /path/to/compute_aggregations.py --all --quiet

Requirements:
    pip install psycopg2-binary click
"""

import click
import psycopg2
import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# QuestDB configuration
QUESTDB_CONFIG = {
    'host': os.getenv('QUESTDB_HOST', 'localhost'),
    'port': int(os.getenv('QUESTDB_PORT', '8812')),
    'user': os.getenv('QUESTDB_USER', 'admin'),
    'password': os.getenv('QUESTDB_PASSWORD', 'quest'),
    'database': os.getenv('QUESTDB_DATABASE', 'qdb'),
}

# Aggregation configuration
AGGREGATION_LEVELS = {
    '1min': {
        'source_table': 'sensor_readings',
        'target_table': 'sensor_readings_1min',
        'interval_seconds': 60,
        'lookback_minutes': 5,
        'bucket_ms': 60000,  # 1 minute in milliseconds
    },
    '5min': {
        'source_table': 'sensor_readings_1min',
        'target_table': 'sensor_readings_5min',
        'interval_seconds': 300,
        'lookback_minutes': 10,
        'bucket_ms': 300000,  # 5 minutes in milliseconds
    },
    '15min': {
        'source_table': 'sensor_readings_5min',
        'target_table': 'sensor_readings_15min',
        'interval_seconds': 900,
        'lookback_minutes': 30,
        'bucket_ms': 900000,  # 15 minutes in milliseconds
    },
    '1hour': {
        'source_table': 'sensor_readings_15min',
        'target_table': 'sensor_readings_1hour',
        'interval_seconds': 3600,
        'lookback_minutes': 120,
        'bucket_ms': 3600000,  # 1 hour in milliseconds
    },
}


def get_connection():
    """Get QuestDB connection via PostgreSQL protocol"""
    try:
        conn = psycopg2.connect(**QUESTDB_CONFIG)
        conn.autocommit = True  # QuestDB requires autocommit for DDL
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to QuestDB: {e}")
        raise


def get_last_processed_timestamp(conn, level: str) -> datetime:
    """Get the last processed timestamp for an aggregation level"""
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT last_processed_timestamp
            FROM aggregation_status
            WHERE aggregation_level = %s
            ORDER BY updated_at DESC
            LIMIT 1
        """, (level,))

        result = cursor.fetchone()

        if result and result[0]:
            return result[0]
        else:
            # Default: start from 1 hour ago
            return datetime.utcnow() - timedelta(hours=1)

    except Exception as e:
        logger.warning(f"Could not get last processed timestamp for {level}: {e}")
        return datetime.utcnow() - timedelta(hours=1)
    finally:
        cursor.close()


def update_aggregation_status(conn, level: str, last_timestamp: datetime,
                               rows_processed: int, duration_ms: int, error: str = None):
    """Update aggregation status tracking"""
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO aggregation_status
            (aggregation_level, last_processed_timestamp, rows_processed,
             processing_duration_ms, error_message, updated_at)
            VALUES (%s, %s, %s, %s, %s, now())
        """, (level, last_timestamp, rows_processed, duration_ms, error))

        logger.debug(f"Updated aggregation status for {level}")

    except Exception as e:
        logger.error(f"Failed to update aggregation status: {e}")
    finally:
        cursor.close()


def compute_aggregation_from_raw(conn, config: Dict, start_time: datetime, end_time: datetime) -> int:
    """
    Compute aggregation from raw sensor_readings table

    Uses SAMPLE BY for efficient aggregation in QuestDB
    """
    cursor = conn.cursor()

    try:
        # Build aggregation query using QuestDB's SAMPLE BY
        query = f"""
            INSERT INTO {config['target_table']}
            SELECT
                timestamp,
                site_id,
                asset_id,
                sensor_type,
                sensor_id,
                first(unit) as unit,
                avg(value) as value_avg,
                min(value) as value_min,
                max(value) as value_max,
                sum(value) as value_sum,
                count(*) as value_count,
                stddev(value) as value_stddev,
                sum(case when quality_flag = 'GOOD' then 1 else 0 end) as good_count,
                sum(case when quality_flag = 'BAD' then 1 else 0 end) as bad_count,
                sum(case when quality_flag = 'OUT_OF_RANGE' then 1 else 0 end) as out_of_range_count,
                min(timestamp) as first_timestamp,
                max(timestamp) as last_timestamp,
                now() as computed_at
            FROM {config['source_table']}
            WHERE timestamp >= to_timestamp(%s)
                AND timestamp < to_timestamp(%s)
            SAMPLE BY {config['interval_seconds']}s
            ALIGN TO CALENDAR
        """

        # Convert timestamps to milliseconds
        start_ms = int(start_time.timestamp() * 1000)
        end_ms = int(end_time.timestamp() * 1000)

        logger.debug(f"Executing aggregation query: {query}")
        logger.debug(f"Time range: {start_time} to {end_time}")

        cursor.execute(query, (start_ms, end_ms))

        rows_affected = cursor.rowcount
        logger.info(f"Computed {rows_affected} aggregation rows for {config['target_table']}")

        return rows_affected

    except Exception as e:
        logger.error(f"Error computing aggregation: {e}")
        raise
    finally:
        cursor.close()


def compute_aggregation_from_aggregated(conn, config: Dict, start_time: datetime, end_time: datetime) -> int:
    """
    Compute higher-level aggregation from lower-level aggregated data

    For example: 5min from 1min, 15min from 5min, 1hour from 15min
    """
    cursor = conn.cursor()

    try:
        # Build aggregation query
        # When aggregating pre-aggregated data, we need to re-calculate properly:
        # - avg: weighted average (sum of value_sum / sum of value_count)
        # - min: min of value_min
        # - max: max of value_max
        # - sum: sum of value_sum
        # - count: sum of value_count
        query = f"""
            INSERT INTO {config['target_table']}
            SELECT
                timestamp,
                site_id,
                asset_id,
                sensor_type,
                sensor_id,
                first(unit) as unit,
                sum(value_sum) / sum(value_count) as value_avg,
                min(value_min) as value_min,
                max(value_max) as value_max,
                sum(value_sum) as value_sum,
                sum(value_count) as value_count,
                sqrt(sum(value_count * value_stddev * value_stddev) / sum(value_count)) as value_stddev,
                sum(good_count) as good_count,
                sum(bad_count) as bad_count,
                sum(out_of_range_count) as out_of_range_count,
                min(first_timestamp) as first_timestamp,
                max(last_timestamp) as last_timestamp,
                now() as computed_at
            FROM {config['source_table']}
            WHERE timestamp >= to_timestamp(%s)
                AND timestamp < to_timestamp(%s)
            SAMPLE BY {config['interval_seconds']}s
            ALIGN TO CALENDAR
        """

        # Convert timestamps to milliseconds
        start_ms = int(start_time.timestamp() * 1000)
        end_ms = int(end_time.timestamp() * 1000)

        logger.debug(f"Executing aggregation query: {query}")
        logger.debug(f"Time range: {start_time} to {end_time}")

        cursor.execute(query, (start_ms, end_ms))

        rows_affected = cursor.rowcount
        logger.info(f"Computed {rows_affected} aggregation rows for {config['target_table']}")

        return rows_affected

    except Exception as e:
        logger.error(f"Error computing aggregation: {e}")
        raise
    finally:
        cursor.close()


def run_aggregation(level: str, force: bool = False) -> Tuple[int, int]:
    """
    Run aggregation for a specific level

    Returns: (rows_processed, duration_ms)
    """
    if level not in AGGREGATION_LEVELS:
        raise ValueError(f"Invalid aggregation level: {level}. Must be one of {list(AGGREGATION_LEVELS.keys())}")

    config = AGGREGATION_LEVELS[level]
    logger.info(f"Running {level} aggregation...")

    start = datetime.utcnow()
    conn = get_connection()

    try:
        # Get last processed timestamp
        if force:
            last_processed = datetime.utcnow() - timedelta(hours=24)
            logger.info(f"Force mode: starting from {last_processed}")
        else:
            last_processed = get_last_processed_timestamp(conn, level)
            logger.info(f"Last processed: {last_processed}")

        # Calculate time range to process
        end_time = datetime.utcnow()
        start_time = last_processed

        # Align to interval boundaries
        interval_seconds = config['interval_seconds']
        start_time = datetime.fromtimestamp(
            (int(start_time.timestamp()) // interval_seconds) * interval_seconds
        )

        logger.info(f"Processing time range: {start_time} to {end_time}")

        # Compute aggregation
        if config['source_table'] == 'sensor_readings':
            # First level: aggregate from raw data
            rows_processed = compute_aggregation_from_raw(conn, config, start_time, end_time)
        else:
            # Higher levels: aggregate from aggregated data
            rows_processed = compute_aggregation_from_aggregated(conn, config, start_time, end_time)

        # Calculate duration
        duration_ms = int((datetime.utcnow() - start).total_seconds() * 1000)

        # Update status
        update_aggregation_status(conn, level, end_time, rows_processed, duration_ms)

        logger.info(f"✓ {level} aggregation completed in {duration_ms}ms ({rows_processed} rows)")

        return rows_processed, duration_ms

    except Exception as e:
        duration_ms = int((datetime.utcnow() - start).total_seconds() * 1000)
        update_aggregation_status(conn, level, last_processed, 0, duration_ms, str(e))
        logger.error(f"✗ {level} aggregation failed: {e}")
        raise

    finally:
        conn.close()


@click.command()
@click.option('--level', type=click.Choice(['1min', '5min', '15min', '1hour', 'all']),
              default='all', help='Aggregation level to compute')
@click.option('--force', is_flag=True, help='Force recompute (last 24 hours)')
@click.option('--quiet', is_flag=True, help='Suppress output (for cron jobs)')
def main(level: str, force: bool, quiet: bool):
    """Compute time-series aggregations for fast queries"""

    if quiet:
        logging.getLogger().setLevel(logging.WARNING)

    logger.info("=" * 60)
    logger.info("dCMMS Time-Series Aggregation Job")
    logger.info("=" * 60)

    try:
        if level == 'all':
            # Run all aggregation levels in order
            levels = ['1min', '5min', '15min', '1hour']
            total_rows = 0
            total_duration = 0

            for lvl in levels:
                rows, duration = run_aggregation(lvl, force)
                total_rows += rows
                total_duration += duration

            logger.info("")
            logger.info("=" * 60)
            logger.info(f"✓ All aggregations completed")
            logger.info(f"  Total rows: {total_rows:,}")
            logger.info(f"  Total duration: {total_duration:,}ms ({total_duration/1000:.2f}s)")
            logger.info("=" * 60)

        else:
            # Run specific level
            rows, duration = run_aggregation(level, force)

            logger.info("")
            logger.info("=" * 60)
            logger.info(f"✓ {level} aggregation completed")
            logger.info(f"  Rows: {rows:,}")
            logger.info(f"  Duration: {duration:,}ms ({duration/1000:.2f}s)")
            logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Aggregation job failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
