import 'package:drift/drift.dart';

class Assets extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get status => text()();
  TextColumn get siteId => text()();
  TextColumn get assetTag => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class WorkOrders extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get description => text()();
  TextColumn get status => text()();
  TextColumn get priority => text()();
  TextColumn get assetId => text().nullable().references(Assets, #id)();
  TextColumn get assignedTo => text().nullable()();
  DateTimeColumn get scheduledDate => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class Users extends Table {
  TextColumn get id => text()();
  TextColumn get username => text()();
  TextColumn get email => text()();
  TextColumn get role => text()();

  @override
  Set<Column> get primaryKey => {id};
}

class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get operation => text()(); // CREATE, UPDATE, DELETE
  TextColumn get targetTable => text()();
  TextColumn get payload => text()(); // JSON string
  TextColumn get status => text().withDefault(
    const Constant('PENDING'),
  )(); // PENDING, SYNCED, FAILED
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}
