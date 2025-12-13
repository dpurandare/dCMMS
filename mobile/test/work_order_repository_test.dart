import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
import 'package:dcmms_mobile/features/work_orders/work_order_repository.dart';
import 'package:drift/drift.dart';

void main() {
  late AppDatabase database;
  late WorkOrderRepository repository;

  setUp(() {
    // In-memory database for testing
    database = AppDatabase(NativeDatabase.memory());
    repository = WorkOrderRepository(database);
  });

  tearDown(() async {
    await database.close();
  });

  test('should insert and retrieve work orders', () async {
    final wo = WorkOrder(
      id: 'wo-1',
      title: 'Fix Generator',
      description: 'Replace fuse',
      status: 'OPEN',
      priority: 'HIGH',
      assetId: 'asset-1',
    );

    await repository.createWorkOrder(wo);

    final allWos = await repository.getAllWorkOrders();
    expect(allWos.length, 1);
    expect(allWos.first.title, 'Fix Generator');

    final retrievedWo = await repository.getWorkOrder('wo-1');
    expect(retrievedWo?.description, 'Replace fuse');
  });
}
