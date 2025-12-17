import 'package:workmanager/workmanager.dart';
import 'package:dcmms_mobile/core/database/app_database.dart';
import 'package:dio/dio.dart';
import 'package:dcmms_mobile/features/sync/sync_repository.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    print("Native called background task: $task");

    // Initialize dependencies manually since we are in a new isolate
    final db = AppDatabase();
    final dio = Dio(
      BaseOptions(baseUrl: 'http://localhost:3000/api/v1'),
    ); // Use env var in real app
    final syncRepo = SyncRepository(db, dio);

    try {
      if (task == 'syncTask') {
        await syncRepo.processQueue();
      }
      return Future.value(true);
    } catch (e) {
      print(e);
      return Future.value(false);
    }
  });
}
