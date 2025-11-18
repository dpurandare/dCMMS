import { db } from './index';
import { tenants, users, sites, assets, workOrders, workOrderTasks } from './schema';
import { AuthService } from '../services/auth.service';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log('Clearing existing data...');
    await db.delete(workOrderTasks);
    await db.delete(workOrders);
    await db.delete(assets);
    await db.delete(sites);
    await db.delete(users);
    await db.delete(tenants);

    // Create tenant
    console.log('Creating tenant...');
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Demo Corporation',
        subdomain: 'demo',
        settings: {
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          currency: 'USD',
        },
        isActive: true,
      })
      .returning();

    console.log(`  ✓ Created tenant: ${tenant.name}`);

    // Create users
    console.log('Creating users...');
    const passwordHash = await AuthService.hashPassword('Password123!');

    const [adminUser] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: 'admin@example.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        passwordHash,
        isActive: true,
      })
      .returning();

    const [managerUser] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: 'manager@example.com',
        username: 'manager',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
        passwordHash,
        isActive: true,
      })
      .returning();

    const [technicianUser] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: 'technician@example.com',
        username: 'technician',
        firstName: 'Tech',
        lastName: 'User',
        role: 'technician',
        passwordHash,
        isActive: true,
      })
      .returning();

    console.log(`  ✓ Created ${3} users`);

    // Create sites
    console.log('Creating sites...');
    const [site1] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteCode: 'NYC-01',
        name: 'New York Distribution Center',
        description: 'Main distribution center in New York',
        type: 'Distribution Center',
        address: '123 Industrial Parkway',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        timezone: 'America/New_York',
        contactName: 'John Smith',
        contactEmail: 'john.smith@example.com',
        contactPhone: '+1-212-555-0100',
        isActive: true,
      })
      .returning();

    const [site2] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteCode: 'LA-01',
        name: 'Los Angeles Warehouse',
        description: 'West coast warehouse facility',
        type: 'Warehouse',
        address: '456 Commerce Street',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'USA',
        timezone: 'America/Los_Angeles',
        contactName: 'Jane Doe',
        contactEmail: 'jane.doe@example.com',
        contactPhone: '+1-310-555-0200',
        isActive: true,
      })
      .returning();

    const [site3] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteCode: 'CHI-01',
        name: 'Chicago Manufacturing Plant',
        description: 'Manufacturing facility in Chicago',
        type: 'Manufacturing',
        address: '789 Factory Lane',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
        timezone: 'America/Chicago',
        contactName: 'Mike Johnson',
        contactEmail: 'mike.johnson@example.com',
        contactPhone: '+1-312-555-0300',
        isActive: true,
      })
      .returning();

    console.log(`  ✓ Created ${3} sites`);

    // Create assets
    console.log('Creating assets...');
    const assetsData = [];

    // NYC - HVAC System (parent asset)
    const [hvacSystem] = await db
      .insert(assets)
      .values({
        tenantId: tenant.id,
        siteId: site1.id,
        assetTag: 'NYC-HVAC-0001',
        name: 'Main HVAC System',
        description: 'Primary heating and cooling system',
        type: 'HVAC',
        manufacturer: 'Carrier',
        model: 'AquaEdge 19DV',
        serialNumber: 'HVAC-2023-001',
        location: 'Mechanical Room A',
        status: 'operational',
        criticality: 'critical',
        installationDate: new Date('2022-01-15'),
        warrantyExpiryDate: new Date('2027-01-15'),
        specifications: {
          capacity: '500 tons',
          refrigerant: 'R-134a',
          voltage: '480V 3-phase',
        },
      })
      .returning();

    // NYC - Forklift
    assetsData.push(
      await db
        .insert(assets)
        .values({
          tenantId: tenant.id,
          siteId: site1.id,
          assetTag: 'NYC-FOR-0001',
          name: 'Forklift #1',
          description: '5000 lb capacity forklift',
          type: 'Forklift',
          manufacturer: 'Toyota',
          model: '8FGCU25',
          serialNumber: 'FL-2023-001',
          location: 'Warehouse Floor',
          status: 'operational',
          criticality: 'high',
          installationDate: new Date('2023-03-10'),
          specifications: {
            capacity: '5000 lbs',
            fuelType: 'Propane',
            liftHeight: '15 ft',
          },
        })
        .returning()
    );

    // LA - Conveyor Belt
    assetsData.push(
      await db
        .insert(assets)
        .values({
          tenantId: tenant.id,
          siteId: site2.id,
          assetTag: 'LA-CON-0001',
          name: 'Main Conveyor Belt',
          description: 'Primary sorting conveyor system',
          type: 'Conveyor',
          manufacturer: 'Interroll',
          model: 'RollerDrive EC5000',
          serialNumber: 'CNV-2022-050',
          location: 'Sorting Area',
          status: 'maintenance',
          criticality: 'high',
          installationDate: new Date('2021-06-20'),
          lastMaintenanceDate: new Date('2024-01-15'),
          specifications: {
            length: '100 ft',
            speed: '200 ft/min',
            maxLoad: '100 lbs',
          },
        })
        .returning()
    );

    // CHI - CNC Machine
    assetsData.push(
      await db
        .insert(assets)
        .values({
          tenantId: tenant.id,
          siteId: site3.id,
          assetTag: 'CHI-CNC-0001',
          name: 'CNC Milling Machine #1',
          description: '5-axis CNC milling machine',
          type: 'CNC Machine',
          manufacturer: 'Haas',
          model: 'UMC-750',
          serialNumber: 'CNC-2020-100',
          location: 'Production Floor B',
          status: 'operational',
          criticality: 'critical',
          installationDate: new Date('2020-09-01'),
          warrantyExpiryDate: new Date('2025-09-01'),
          specifications: {
            axes: 5,
            spindleSpeed: '12000 RPM',
            tableSize: '30x16 inches',
          },
        })
        .returning()
    );

    // CHI - Air Compressor
    assetsData.push(
      await db
        .insert(assets)
        .values({
          tenantId: tenant.id,
          siteId: site3.id,
          assetTag: 'CHI-COM-0001',
          name: 'Industrial Air Compressor',
          description: 'Main air compressor for plant',
          type: 'Compressor',
          manufacturer: 'Atlas Copco',
          model: 'GA 55',
          serialNumber: 'COMP-2021-025',
          location: 'Compressor Room',
          status: 'operational',
          criticality: 'high',
          installationDate: new Date('2021-11-10'),
          specifications: {
            capacity: '270 CFM',
            pressure: '125 PSI',
            power: '75 HP',
          },
        })
        .returning()
    );

    console.log(`  ✓ Created ${assetsData.length + 1} assets`);

    // Create work orders
    console.log('Creating work orders...');

    // Preventive maintenance
    const [wo1] = await db
      .insert(workOrders)
      .values({
        tenantId: tenant.id,
        workOrderId: 'WO-20240118-0001',
        title: 'Quarterly HVAC Maintenance',
        description: 'Scheduled quarterly maintenance for main HVAC system including filter replacement and system inspection',
        type: 'preventive',
        priority: 'medium',
        status: 'in_progress',
        siteId: site1.id,
        assetId: hvacSystem.id,
        assignedTo: technicianUser.id,
        scheduledStartDate: new Date('2024-01-20'),
        scheduledEndDate: new Date('2024-01-21'),
        actualStartDate: new Date('2024-01-20T08:00:00'),
        estimatedHours: 8,
      })
      .returning();

    // Corrective maintenance
    await db.insert(workOrders).values({
      tenantId: tenant.id,
      workOrderId: 'WO-20240118-0002',
      title: 'Repair Conveyor Belt Motor',
      description: 'Motor is making unusual noises and needs inspection/repair',
      type: 'corrective',
      priority: 'high',
      status: 'open',
      siteId: site2.id,
      assetId: assetsData[1][0].id,
      assignedTo: technicianUser.id,
      scheduledStartDate: new Date('2024-01-19'),
      scheduledEndDate: new Date('2024-01-19'),
      estimatedHours: 4,
    });

    // Emergency work order
    await db.insert(workOrders).values({
      tenantId: tenant.id,
      workOrderId: 'WO-20240118-0003',
      title: 'Emergency: CNC Machine Coolant Leak',
      description: 'Coolant leak detected on CNC machine. Immediate attention required.',
      type: 'emergency',
      priority: 'critical',
      status: 'open',
      siteId: site3.id,
      assetId: assetsData[2][0].id,
      assignedTo: managerUser.id,
      scheduledStartDate: new Date('2024-01-18'),
      scheduledEndDate: new Date('2024-01-18'),
      estimatedHours: 2,
    });

    // Completed work order
    await db.insert(workOrders).values({
      tenantId: tenant.id,
      workOrderId: 'WO-20240115-0001',
      title: 'Monthly Forklift Inspection',
      description: 'Monthly safety inspection and fluid level check',
      type: 'inspection',
      priority: 'medium',
      status: 'completed',
      siteId: site1.id,
      assetId: assetsData[0][0].id,
      assignedTo: technicianUser.id,
      scheduledStartDate: new Date('2024-01-15'),
      scheduledEndDate: new Date('2024-01-15'),
      actualStartDate: new Date('2024-01-15T09:00:00'),
      actualEndDate: new Date('2024-01-15T10:30:00'),
      estimatedHours: 2,
      actualHours: 1.5,
    });

    console.log(`  ✓ Created ${4} work orders`);

    // Create work order tasks
    console.log('Creating work order tasks...');
    await db.insert(workOrderTasks).values([
      {
        workOrderId: wo1.id,
        title: 'Replace air filters',
        description: 'Replace all air filters in HVAC system',
        sequence: 1,
        status: 'completed',
        estimatedHours: 2,
        actualHours: 1.5,
      },
      {
        workOrderId: wo1.id,
        title: 'Inspect refrigerant levels',
        description: 'Check and top up refrigerant if needed',
        sequence: 2,
        status: 'in_progress',
        estimatedHours: 1,
      },
      {
        workOrderId: wo1.id,
        title: 'Clean condenser coils',
        description: 'Clean condenser coils and check for corrosion',
        sequence: 3,
        status: 'pending',
        estimatedHours: 3,
      },
      {
        workOrderId: wo1.id,
        title: 'Test system performance',
        description: 'Run system tests and verify proper operation',
        sequence: 4,
        status: 'pending',
        estimatedHours: 2,
      },
    ]);

    console.log(`  ✓ Created ${4} work order tasks`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • 1 tenant`);
    console.log(`   • 3 users (admin, manager, technician)`);
    console.log(`   • 3 sites`);
    console.log(`   • 5 assets`);
    console.log(`   • 4 work orders`);
    console.log(`   • 4 work order tasks`);
    console.log('\n🔐 Login credentials:');
    console.log('   • admin@example.com / Password123!');
    console.log('   • manager@example.com / Password123!');
    console.log('   • technician@example.com / Password123!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run seed
seed()
  .then(() => {
    console.log('\n👋 Seed complete. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
