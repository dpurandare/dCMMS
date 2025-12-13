import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
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
            createdAt: Value(DateTime.now()),
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
    try {
      // TODO: Implement actual API call based on item.operation and item.targetTable
      // Example:
      // if (item.targetTable == 'work_orders' && item.operation == 'CREATE') {
      //   await api.createWorkOrder(item.payload);
      // }

      // Simulate network request
      // Throw random error for testing purpose (remove in production)
      // if (DateTime.now().second % 10 == 0) throw Exception("Simulated Network Error");

      await Future.delayed(const Duration(milliseconds: 500));
      return true;
    } on Exception catch (e) {
      print('Sync error for item ${item.id}: $e');
      // In a real app, we might want to check the type of error.
      // If it's a 4xx error (validation), we might want to mark it as FAILED or REQUIRES_ACTION.
      // If it's a 5xx or network error, we keep it PENDING for retry.

      // For now, we return false to indicate it wasn't processed this time.
      return false;
    } catch (e) {
      print('Unknown sync error for item ${item.id}: $e');
      return false;
    }
  }
}

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  final db = ref.watch(databaseProvider);
  return SyncRepository(db);
});
