import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dcmms_mobile/core/database/database.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';

class SyncRepository {
  final AppDatabase _db;
  final Connectivity _connectivity;

  SyncRepository(this._db) : _connectivity = Connectivity();

  // Watch network status
  Stream<List<ConnectivityResult>> get connectivityStream =>
      _connectivity.onConnectivityChanged;

  // Check if online
  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  // Add to Sync Queue
  Future<int> addToQueue(String operation, String targetTable, String payload) {
    return _db
        .into(_db.syncQueue)
        .insert(
          SyncQueueCompanion(
            operation: Value(operation),
            targetTable: Value(targetTable),
            payload: Value(payload),
            timestamp: Value(DateTime.now()),
            status: Value('PENDING'),
          ),
        );
  }

  // Process Sync Queue (Push to Backend)
  Future<void> processQueue() async {
    if (!await isOnline) return;

    final pendingItems = await (_db.select(
      _db.syncQueue,
    )..where((t) => t.status.equals('PENDING'))).get();

    for (final item in pendingItems) {
      try {
        bool success = await _pushItem(item);
        if (success) {
          await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
              .write(SyncQueueCompanion(status: Value('COMPLETED')));
        } else {
          await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
              .write(SyncQueueCompanion(status: Value('FAILED')));
        }
      } catch (e) {
        // Handle error, maybe retry later
        print('Sync failed for item ${item.id}: $e');
      }
    }
  }

  Future<bool> _pushItem(SyncQueueData item) async {
    // TODO: Implement actual API call based on item.operation and item.targetTable
    // Example:
    // if (item.targetTable == 'work_orders' && item.operation == 'CREATE') {
    //   await api.createWorkOrder(item.payload);
    // }

    // Simulate success for now
    await Future.delayed(const Duration(milliseconds: 500));
    return true;
  }
}

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  final db = ref.watch(databaseProvider);
  return SyncRepository(db);
});
