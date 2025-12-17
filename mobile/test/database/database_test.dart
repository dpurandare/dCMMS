import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';

void main() {
  late AppDatabase database;

  setUp(() {
    database = AppDatabase(NativeDatabase.memory());
  });

  tearDown(() async {
    await database.close();
  });

  test('database schema should be valid', () async {
    await database.customSelect('SELECT 1').get();
  });

  test('should be able to insert and read a user', () async {
    final user = UsersCompanion.insert(
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'technician',
    );

    await database.into(database.users).insert(user);

    final savedUser = await (database.select(
      database.users,
    )..where((t) => t.id.equals('1'))).getSingle();

    expect(savedUser.username, 'testuser');
    expect(savedUser.email, 'test@example.com');
  });

  test('should be able to insert and read a sync queue item', () async {
    final syncItem = SyncQueueCompanion.insert(
      operation: 'CREATE',
      targetTable: 'users',
      payload: '{}',
    );

    final id = await database.into(database.syncQueue).insert(syncItem);

    final savedItem = await (database.select(
      database.syncQueue,
    )..where((t) => t.id.equals(id))).getSingle();

    expect(savedItem.operation, 'CREATE');
    expect(savedItem.targetTable, 'users');
  });
}
