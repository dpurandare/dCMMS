"""
Feast Entity Definitions for dCMMS
Entities represent the primary keys for feature lookups
"""

from feast import Entity, ValueType

# Asset entity
asset = Entity(
    name="asset",
    description="Physical asset (solar panel, wind turbine, transformer, etc.)",
    value_type=ValueType.STRING,
    join_keys=["asset_id"],
)

# Work Order entity
work_order = Entity(
    name="work_order",
    description="Maintenance work order",
    value_type=ValueType.STRING,
    join_keys=["work_order_id"],
)

# Site entity
site = Entity(
    name="site",
    description="Physical location/site",
    value_type=ValueType.STRING,
    join_keys=["site_id"],
)
