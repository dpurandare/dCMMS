import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
import '../../core/providers.dart';

class WorkOrderRepository {
  final AppDatabase _db;

  WorkOrderRepository(this._db);

  Stream<List<WorkOrder>> watchWorkOrders() {
    return _db.select(_db.workOrders).watch();
  }

  Future<List<WorkOrder>> getAllWorkOrders() {
    // In a real app, this might trigger a sync
    return _db.getAllWorkOrders();
  }

  Future<WorkOrder?> getWorkOrder(String id) {
    return (_db.select(
      _db.workOrders,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<void> createWorkOrder(WorkOrder wo) async {
    await _db.insertWorkOrder(wo);
    // TODO: Add to sync queue
  }
}

final workOrderRepositoryProvider = Provider<WorkOrderRepository>((ref) {
  final db = ref.watch(databaseProvider);
  return WorkOrderRepository(db);
});
