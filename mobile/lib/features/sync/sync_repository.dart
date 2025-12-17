import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';

import 'package:dio/dio.dart';
import 'dart:convert';
import 'dart:async';

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

  // Sync Status Stream
  final _syncStatusController = StreamController<String>.broadcast();
  Stream<String> get syncStatus => _syncStatusController.stream;

  Future<void> processQueue() async {
    if (!await isOnline) return;

    _syncStatusController.add('SYNCING');

    final pendingItems = await (_db.select(
      _db.syncQueue,
    )..where((t) => t.status.equals('PENDING'))).get();

    for (final item in pendingItems) {
      if (item.retryCount >= 5) {
        // Mark as failed after max retries
        await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
            .write(SyncQueueCompanion(status: Value('FAILED')));
        continue;
      }

      try {
        bool success = await _pushItem(item);
        if (success) {
          await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
              .write(SyncQueueCompanion(status: Value('COMPLETED')));
        }
      } catch (e) {
        print('Sync failed for item ${item.id}: $e');
        // Increment retry count
        await (_db.update(
          _db.syncQueue,
        )..where((t) => t.id.equals(item.id))).write(
          SyncQueueCompanion(
            retryCount: Value(item.retryCount + 1),
            lastAttempt: Value(DateTime.now()),
          ),
        );
      }
    }

    _syncStatusController.add('IDLE');
  }

  Future<bool> _pushItem(SyncQueueData item) async {
    try {
      final data = jsonDecode(item.payload);
      final id = data['id'] ?? data['workOrderId'];

      if (item.targetTable == 'work_orders') {
        if (item.operation == 'CREATE') {
          await _dio.post('/work-orders', data: data);
          return true;
        } else if (item.operation == 'UPDATE') {
          await _dio.patch('/work-orders/$id', data: data);
          return true;
        } else if (item.operation == 'DELETE') {
          await _dio.delete('/work-orders/$id');
          return true;
        }
      }

      print('Unhandled sync item: ${item.targetTable} ${item.operation}');
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        // CONFLICT DETECTED - Server Wins Strategy
        try {
          print(
            'Conflict detected for item ${item.id}. Fetching latest from server...',
          );
          final data = jsonDecode(item.payload);
          final id = data['id'] ?? data['workOrderId'];

          if (id != null && item.targetTable == 'work_orders') {
            final response = await _dio.get('/work-orders/$id');
            final serverData = response.data;

            // Update local database with server data
            await _db
                .into(_db.workOrders)
                .insertOnConflictUpdate(
                  WorkOrdersCompanion(
                    id: Value(serverData['id']),
                    title: Value(serverData['title']),
                    status: Value(serverData['status']),
                    // Add other fields as necessary, this is a simplified update
                    version: Value(serverData['version'] ?? 1),
                  ),
                );
          }
          return true; // Resolved
        } catch (fetchError) {
          print('Failed to resolve conflict: $fetchError');
          rethrow; // Retry later
        }
      }

      if (e.response?.statusCode != null &&
          e.response!.statusCode! >= 400 &&
          e.response!.statusCode! < 500) {
        return false; // Validation error, do not retry
      }
      rethrow; // Transient error, needs retry
    }
  }
}

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final dio = ref.watch(dioProvider);
  return SyncRepository(db, dio);
});
