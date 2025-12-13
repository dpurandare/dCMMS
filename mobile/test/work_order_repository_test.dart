import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
import 'package:dcmms_mobile/features/work_orders/work_order_repository.dart';
import 'package:dcmms_mobile/features/sync/sync_repository.dart';
import 'package:drift/drift.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

// Simple Mock since we don't have mockito
class MockSyncRepository implements SyncRepository {
  @override
  Stream<List<ConnectivityResult>> get connectivityStream =>
      const Stream.empty();

  @override
  Future<bool> get isOnline async => true;

  @override
  Future<int> addToQueue(
    String operation,
    String targetTable,
    String payload,
  ) async {
    return 1; // Success
  }

  @override
  Future<void> processQueue() async {}
}

void main() {
  late AppDatabase database;
  late WorkOrderRepository repository;
  late MockSyncRepository syncRepository;

  setUp(() {
    // In-memory database for testing
    database = AppDatabase(NativeDatabase.memory());
    syncRepository = MockSyncRepository();
    repository = WorkOrderRepository(database, syncRepository);
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

    // This calls syncRepo.addToQueue, which is mocked
    await repository.createWorkOrder(wo);

    final allWos = await repository.getAllWorkOrders();
    expect(allWos.length, 1);
    expect(allWos.first.title, 'Fix Generator');

    final retrievedWo = await repository.getWorkOrder('wo-1');
    expect(retrievedWo?.description, 'Replace fuse');
  });
}
