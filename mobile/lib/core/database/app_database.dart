import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'tables.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Assets, WorkOrders, SyncQueue, Users])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? e]) : super(e ?? _openConnection());

  @override
  int get schemaVersion => 1;

  // CRUD Operations - Users
  Future<int> insertUser(User user) =>
      into(users).insert(user, mode: InsertMode.insertOrReplace);
  Future<User?> getUserById(String id) =>
      (select(users)..where((t) => t.id.equals(id))).getSingleOrNull();

  // CRUD Operations - Assets
  Future<int> insertAsset(Asset asset) =>
      into(assets).insert(asset, mode: InsertMode.insertOrReplace);
  Future<List<Asset>> getAllAssets() => select(assets).get();
  Future<Asset?> getAssetById(String id) =>
      (select(assets)..where((t) => t.id.equals(id))).getSingleOrNull();

  // CRUD Operations - WorkOrders
  Future<int> insertWorkOrder(WorkOrder wo) =>
      into(workOrders).insert(wo, mode: InsertMode.insertOrReplace);
  Future<List<WorkOrder>> getAllWorkOrders() => select(workOrders).get();
  Future<List<WorkOrder>> getWorkOrdersForAsset(String assetId) =>
      (select(workOrders)..where((t) => t.assetId.equals(assetId))).get();

  // CRUD Operations - SyncQueue
  Future<int> queueOperation(SyncQueueCompanion entry) =>
      into(syncQueue).insert(entry);
  Future<List<SyncQueueData>> getPendingOperations() =>
      (select(syncQueue)..where((t) => t.status.equals('PENDING'))).get();
  Future<void> updateSyncStatus(int id, String status) =>
      (update(syncQueue)..where((t) => t.id.equals(id))).write(
        SyncQueueCompanion(status: Value(status)),
      );
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'db.sqlite'));
    return NativeDatabase(file);
  });
}
