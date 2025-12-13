import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
import 'package:dcmms_mobile/features/sync/sync_repository.dart';
import 'dart:convert';
import '../../core/providers.dart';

class WorkOrderRepository {
  final AppDatabase _db;
  final SyncRepository _syncRepo;

  WorkOrderRepository(this._db, this._syncRepo);

  Stream<List<WorkOrder>> watchWorkOrders() {
    return _db.select(_db.workOrders).watch();
  }

  Future<List<WorkOrder>> getAllWorkOrders() {
    return _db.getAllWorkOrders();
  }

  Future<WorkOrder?> getWorkOrder(String id) {
    return (_db.select(
      _db.workOrders,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<void> createWorkOrder(WorkOrder wo) async {
    await _db.insertWorkOrder(wo);
    await _syncRepo.addToQueue(
      'CREATE',
      'work_orders',
      jsonEncode(wo.toJson()),
    );
  }
}

final workOrderRepositoryProvider = Provider<WorkOrderRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncRepo = ref.watch(syncRepositoryProvider);
  return WorkOrderRepository(db, syncRepo);
});
