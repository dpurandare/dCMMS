import { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("wind_work_order_templates").del();

  // Tenant ID (using the default one from other seeds)
  const tenantId = "00000000-0000-0000-0000-000000000001";

  const templates = [
    {
      id: uuidv4(),
      tenant_id: tenantId,
      template_name: "Blade Visual Inspection",
      template_code: "WIND_BLADE_VISUAL_INSPECT",
      description:
        "Visual inspection of turbine blades for cracks, erosion, or lightning damage.",
      default_priority: "medium",
      default_type: "preventive",
      estimated_duration_hours: 4.0,
      checklist_items: JSON.stringify([
        { item: "Inspect leading edge for erosion", required: true },
        { item: "Check for lightning strike damage", required: true },
        { item: "Inspect trailing edge for cracks", required: true },
        { item: "Photograph any defects found", required: true },
        { item: "Check drain holes for blockage", required: false },
      ]),
      required_skills: JSON.stringify(["rope_access", "blade_inspection"]),
      safety_requirements: JSON.stringify([
        "harness",
        "helmet",
        "wind_speed_limit_10ms",
      ]),
      typical_parts: JSON.stringify([]),
      frequency_days: 180,
      frequency_description: "Every 6 months",
      is_active: true,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      template_name: "Gearbox Oil Change",
      template_code: "WIND_GEARBOX_OIL_CHANGE",
      description:
        "Complete oil change and filter replacement for main gearbox.",
      default_priority: "high",
      default_type: "preventive",
      estimated_duration_hours: 8.0,
      checklist_items: JSON.stringify([
        { item: "Take oil sample for analysis", required: true },
        { item: "Drain old oil", required: true },
        { item: "Replace oil filter", required: true },
        { item: "Fill with new oil to specified level", required: true },
        { item: "Check for leaks", required: true },
        { item: "Reset maintenance counter", required: true },
      ]),
      required_skills: JSON.stringify([
        "mechanical_maintenance",
        "hazardous_materials_handling",
      ]),
      safety_requirements: JSON.stringify([
        "gloves",
        "eye_protection",
        "spill_kit",
      ]),
      typical_parts: JSON.stringify([
        { part_code: "OIL_FILTER_GBX", quantity: 1 },
        { part_code: "GEAR_OIL_SYNTHETIC", quantity: 300 }, // Liters
      ]),
      frequency_days: 365,
      frequency_description: "Annual",
      is_active: true,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      template_name: "Generator Inspection",
      template_code: "WIND_GENERATOR_INSPECT",
      description: "Inspection of generator brushes, slip rings, and bearings.",
      default_priority: "medium",
      default_type: "preventive",
      estimated_duration_hours: 3.0,
      checklist_items: JSON.stringify([
        { item: "Inspect carbon brushes for wear", required: true },
        { item: "Clean slip ring compartment", required: true },
        { item: "Check bearing grease levels", required: true },
        { item: "Inspect cooling fans", required: false },
        { item: "Measure insulation resistance", required: true },
      ]),
      required_skills: JSON.stringify([
        "electrical_maintenance",
        "high_voltage_safety",
      ]),
      safety_requirements: JSON.stringify(["arc_flash_suit", "lockout_tagout"]),
      typical_parts: JSON.stringify([
        { part_code: "CARBON_BRUSH_SET", quantity: 1 },
      ]),
      frequency_days: 365,
      frequency_description: "Annual",
      is_active: true,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      template_name: "Yaw System Maintenance",
      template_code: "WIND_YAW_GREASE",
      description: "Greasing of yaw bearing and inspection of yaw brakes.",
      default_priority: "medium",
      default_type: "preventive",
      estimated_duration_hours: 2.5,
      checklist_items: JSON.stringify([
        { item: "Grease yaw bearing", required: true },
        { item: "Inspect yaw brake pads", required: true },
        { item: "Check hydraulic pressure", required: true },
        { item: "Test yaw operation", required: true },
      ]),
      required_skills: JSON.stringify(["mechanical_maintenance"]),
      safety_requirements: JSON.stringify(["gloves", "pinch_point_awareness"]),
      typical_parts: JSON.stringify([
        { part_code: "GREASE_CARTRIDGE_EP2", quantity: 4 },
      ]),
      frequency_days: 180,
      frequency_description: "Every 6 months",
      is_active: true,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      template_name: "Electrical Systems Inspection",
      template_code: "WIND_ELECTRICAL_INSPECT",
      description: "Inspection of converter, transformer, and switchgear.",
      default_priority: "high",
      default_type: "preventive",
      estimated_duration_hours: 6.0,
      checklist_items: JSON.stringify([
        { item: "Thermographic scan of connections", required: true },
        { item: "Check torque on busbar connections", required: true },
        { item: "Clean converter cabinets", required: true },
        { item: "Test emergency stop circuit", required: true },
        { item: "Inspect transformer oil level/pressure", required: true },
      ]),
      required_skills: JSON.stringify([
        "electrical_maintenance",
        "thermography",
      ]),
      safety_requirements: JSON.stringify(["arc_flash_suit", "lockout_tagout"]),
      typical_parts: JSON.stringify([]),
      frequency_days: 365,
      frequency_description: "Annual",
      is_active: true,
    },
  ];

  await knex("wind_work_order_templates").insert(templates);
}
