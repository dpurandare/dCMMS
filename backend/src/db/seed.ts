import { db } from "./index";
import {
  tenants,
  users,
  sites,
  assets,
  workOrders,
  workOrderTasks,
} from "./schema";
import { AuthService } from "../services/auth.service";

async function seed() {
  console.log("🌱 Starting database seed...");


  // Seeding logic for all environments
  const environment = process.env.NODE_ENV || "development";
  const isProduction = environment === "production";
  console.log(`   Environment: ${environment} ✓`);

  // Check if any users exist
  const existingUsers = await db.select().from(users).limit(1);
  if (isProduction && existingUsers.length > 0) {
    console.log("Users already exist in production. Skipping admin seeding.");
    return;
  }

  // In production, only seed admin if no users exist
  // In dev/test, continue with full seed

  try {

    let tenant;
    if (isProduction) {
      // In production, create a default tenant if none exists
      const existingTenants = await db.select().from(tenants).limit(1);
      if (existingTenants.length === 0) {
        [tenant] = await db
          .insert(tenants)
          .values({
            tenantId: "default-tenant",
            name: "Default Tenant",
            domain: "production.dcmms.com",
            config: JSON.stringify({
              timezone: "UTC",
              dateFormat: "YYYY-MM-DD",
              currency: "USD",
            }),
          })
          .returning();
        console.log(`  ✓ Created tenant: ${tenant.name}`);
      } else {
        tenant = existingTenants[0];
        console.log(`  ✓ Using existing tenant: ${tenant.name}`);
      }

      // Seed only the admin user with a strong default password
      const strongDefaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "ChangeMeNow!2024";
      const passwordHash = await AuthService.hashPassword(strongDefaultPassword);
      await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: "admin@production.com",
          username: "admin",
          firstName: "Admin",
          lastName: "User",
          role: "tenant_admin",
          passwordHash,
          metadata: JSON.stringify({ requirePasswordChange: true }),
        });
      console.log("  ✓ Seeded admin user for production: admin@production.com / " + strongDefaultPassword);
      return;
    }
    // Non-production: continue with full seed
    // ...existing code for dev/test seeding...
    
    // Hash password for non-production users
    const defaultPassword = "Password123!";
    const passwordHash = await AuthService.hashPassword(defaultPassword);

    const [managerUser] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: "manager@example.com",
        username: "manager",
        firstName: "Manager",
        lastName: "User",
        role: "site_manager",
        passwordHash,
      })
      .returning();

    const [technicianUser] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: "technician@example.com",
        username: "technician",
        firstName: "Tech",
        lastName: "User",
        role: "technician",
        passwordHash,
      })
      .returning();

    console.log(`  ✓ Created ${3} users`);

    // Create sites
    console.log("Creating sites...");
    const [site1] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteId: "NYC-01",
        name: "New York Distribution Center",
        type: "Distribution Center",
        location: "123 Industrial Parkway, New York, NY 10001, USA",
      })
      .returning();

    const [site2] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteId: "LA-01",
        name: "Los Angeles Warehouse",
        type: "Warehouse",
        location: "456 Commerce Street, Los Angeles, CA 90001, USA",
      })
      .returning();

    const [site3] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteId: "CHI-01",
        name: "Chicago Manufacturing Plant",
        type: "Manufacturing",
        location: "789 Factory Lane, Chicago, IL 60601, USA",
      })
      .returning();

    console.log(`  ✓ Created ${3} sites`);

    // Create assets
    console.log("Creating assets...");
    const assetsData = [];

    // NYC - HVAC System (parent asset)
    const [hvacSystem] = (await db
      .insert(assets)
      .values({
        tenantId: tenant.id,
        siteId: site1.id,
        assetId: "NYC-HVAC-0001",
        name: "Main HVAC System",
        type: "other",
        manufacturer: "Carrier",
        model: "AquaEdge 19DV",
        serialNumber: "HVAC-2023-001",
        location: "Mechanical Room A",
        status: "operational",

        installationDate: new Date("2022-01-15"),
        warrantyExpiryDate: new Date("2027-01-15"),
        specifications: JSON.stringify({
          capacity: "500 tons",
          refrigerant: "R-134a",
          voltage: "480V 3-phase",
        }),
      })
      .returning()) as any[];
    assetsData.push(hvacSystem);

    // NYC - Forklift
    const [forklift] = (await db
      .insert(assets)
      .values({
        tenantId: tenant.id,
        siteId: site1.id,
        assetId: "NYC-FOR-0001",
        name: "Forklift #1",
        type: "other",
        manufacturer: "Toyota",
        model: "8FGCU25",
        serialNumber: "FL-2023-001",
        location: "Warehouse Floor",
        status: "operational",

        installationDate: new Date("2023-03-10"),
        specifications: JSON.stringify({
          capacity: "5000 lbs",
          fuelType: "Propane",
          liftHeight: "15 ft",
        }),
      })
      .returning()) as any[];
    assetsData.push(forklift);

    // LA - Conveyor Belt
    const [conveyor] = (await db
      .insert(assets)
      .values({
        tenantId: tenant.id,
        siteId: site2.id,
        assetId: "LA-CON-0001",
        name: "Main Conveyor Belt",
        type: "other",
        manufacturer: "Interroll",
        model: "RollerDrive EC5000",
        serialNumber: "CNV-2022-050",
        location: "Sorting Area",
        status: "maintenance",

        installationDate: new Date("2021-06-20"),

        specifications: JSON.stringify({
          length: "100 ft",
          speed: "200 ft/min",
          maxLoad: "100 lbs",
        }),
      })
      .returning()) as any[];
    assetsData.push(conveyor);

    // CHI - CNC Machine
    const [cncMachine] = (await db
      .insert(assets)
      .values({
        tenantId: tenant.id,
        siteId: site3.id,
        assetId: "CHI-CNC-0001",
        name: "CNC Milling Machine #1",
        type: "other",
        manufacturer: "Haas",
        model: "UMC-750",
        serialNumber: "CNC-2020-100",
        location: "Production Floor B",
        status: "operational",

        installationDate: new Date("2020-09-01"),
        warrantyExpiryDate: new Date("2025-09-01"),
        specifications: JSON.stringify({
          axes: 5,
          spindleSpeed: "12000 RPM",
          tableSize: "30x16 inches",
        }),
      })
      .returning()) as any[];
    assetsData.push(cncMachine);

    // CHI - Air Compressor
    const [compressor] = (await db
      .insert(assets)
      .values({
        tenantId: tenant.id,
        siteId: site3.id,
        assetId: "CHI-COM-0001",
        name: "Industrial Air Compressor",
        type: "other",
        manufacturer: "Atlas Copco",
        model: "GA 55",
        serialNumber: "AC-2019-050",
        location: "Utility Room",
        status: "operational",

        installationDate: new Date("2019-05-15"),
        specifications: JSON.stringify({
          capacity: "100 CFM",
          pressure: "125 PSI",
          power: "55 kW",
        }),
      })
      .returning()) as any[];
    assetsData.push(compressor);

    console.log(`  ✓ Created ${assetsData.length + 1} assets`);

    // Create work orders
    console.log("Creating work orders...");

    // Preventive maintenance
    const [wo1] = await db
      .insert(workOrders)
      .values({
        tenantId: tenant.id,
        workOrderId: "WO-20240118-0001",
        title: "Quarterly HVAC Maintenance",
        description:
          "Scheduled quarterly maintenance for main HVAC system including filter replacement and system inspection",
        type: "preventive",
        priority: "medium",
        status: "in_progress",
        siteId: site1.id,
        assetId: hvacSystem.id,
        assignedTo: technicianUser.id,
        createdBy: managerUser.id,
        scheduledStart: new Date("2024-01-20"),
        scheduledEnd: new Date("2024-01-21"),
        actualStart: new Date("2024-01-20T08:00:00"),
        estimatedHours: "8",
      })
      .returning();

    // Corrective maintenance
    await db.insert(workOrders).values({
      tenantId: tenant.id,
      workOrderId: "WO-20240118-0002",
      title: "Repair Conveyor Belt Motor",
      description: "Motor is making unusual noises and needs inspection/repair",
      type: "corrective",
      priority: "high",
      status: "open",
      siteId: site2.id,
      assetId: assetsData[1].id,
      assignedTo: technicianUser.id,
      createdBy: managerUser.id,
      scheduledStart: new Date("2024-01-19"),
      scheduledEnd: new Date("2024-01-19"),
      estimatedHours: "4",
    });

    // Emergency work order
    await db.insert(workOrders).values({
      tenantId: tenant.id,
      workOrderId: "WO-20240118-0003",
      title: "Emergency: CNC Machine Coolant Leak",
      description:
        "Coolant leak detected on CNC machine. Immediate attention required.",
      type: "emergency",
      priority: "critical",
      status: "open",
      siteId: site3.id,
      assetId: assetsData[2].id,
      assignedTo: managerUser.id,
      createdBy: managerUser.id,
      scheduledStart: new Date("2024-01-18"),
      scheduledEnd: new Date("2024-01-18"),
      estimatedHours: "2",
    });

    // Completed work order
    await db.insert(workOrders).values({
      tenantId: tenant.id,
      workOrderId: "WO-20240115-0001",
      title: "Monthly Forklift Inspection",
      description: "Monthly safety inspection and fluid level check",
      type: "inspection",
      priority: "medium",
      status: "completed",
      siteId: site1.id,
      assetId: assetsData[0].id,
      assignedTo: technicianUser.id,
      createdBy: managerUser.id,
      scheduledStart: new Date("2024-01-15"),
      scheduledEnd: new Date("2024-01-15"),
      actualStart: new Date("2024-01-15T09:00:00"),
      actualEnd: new Date("2024-01-15T10:30:00"),
      estimatedHours: "2",
      actualHours: "1.5",
    });

    console.log(`  ✓ Created ${4} work orders`);

    // Create work order tasks
    console.log("Creating work order tasks...");
    await db.insert(workOrderTasks).values([
      {
        workOrderId: wo1.id,
        title: "Replace air filters",
        description: "Replace all air filters in HVAC system",
        taskOrder: 1,
        isCompleted: true,
      },
      {
        workOrderId: wo1.id,
        title: "Inspect refrigerant levels",
        description: "Check and top up refrigerant if needed",
        taskOrder: 2,
        isCompleted: false,
      },
      {
        workOrderId: wo1.id,
        title: "Clean condenser coils",
        description: "Clean condenser coils and check for corrosion",
        taskOrder: 3,
      },
      {
        workOrderId: wo1.id,
        title: "Test system performance",
        description: "Run system tests and verify proper operation",
        taskOrder: 4,
        isCompleted: false,
      },
    ]);

    console.log(`  ✓ Created ${4} work order tasks`);

    console.log("\n✅ Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • 1 tenant`);
    console.log(`   • 3 users (admin, manager, technician)`);
    console.log(`   • 3 sites`);
    console.log(`   • 5 assets`);
    console.log(`   • 4 work orders`);
    console.log(`   • 4 work order tasks`);
    console.log("\n🔐 Login credentials:");
    console.log("   • admin@example.com / Password123!");
    console.log("   • manager@example.com / Password123!");
    console.log("   • technician@example.com / Password123!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Export for use in auto-seed
export { seed };

// Run seed if executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("\n👋 Seed complete. Exiting...");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
