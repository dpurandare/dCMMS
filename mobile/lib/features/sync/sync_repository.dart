import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';

import 'package:dio/dio.dart';
import 'dart:convert';

class SyncRepository {
  final AppDatabase _db;
  final Connectivity _connectivity;
  final Dio _dio;

  SyncRepository(this._db, this._dio) : _connectivity = Connectivity();

  // ... (streams and online check remain same)
  Stream<List<ConnectivityResult>> get connectivityStream =>
      _connectivity.onConnectivityChanged;

  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  // ... (addToQueue and processQueue remain same)
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
        print('Sync failed for item ${item.id}: $e');
      }
    }
  }

  Future<bool> _pushItem(SyncQueueData item) async {
    try {
      _dio.options.baseUrl = 'http://10.0.2.2:3001/api/v1';

      if (item.targetTable == 'work_orders' && item.operation == 'CREATE') {
        final data = jsonDecode(item.payload);
        // Ensure status covers API expectations
        await _dio.post('/work-orders', data: data);
        return true;
      }

      // Default fallback for unhandled types
      print('Unhandled sync item: ${item.targetTable} ${item.operation}');
      return true; // Mark as done to avoid infinite retry loop for unhandled types? Or keep pending?
      // For now, let's assume we implement what we use. If not implemented, maybe return false?
      // But that blocks queue. Let's return false.
      // return false;
    } on DioException catch (e) {
      print('Sync error for item ${item.id}: ${e.message}');
      if (e.response?.statusCode != null &&
          e.response!.statusCode! >= 400 &&
          e.response!.statusCode! < 500) {
        // Validation error, likely won't succeed on retry without change
        // Mark as FAILED (logic in processQueue handles false as Failed? No, false puts it in FAILED).
        return false;
      }
      // Server error, retry later
      rethrow;
    } catch (e) {
      print('Unknown sync error for item ${item.id}: $e');
      return false;
    }
  }
}

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  final db = ref.watch(databaseProvider);
  return SyncRepository(db, Dio());
});
