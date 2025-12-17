import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';

import 'package:workmanager/workmanager.dart';
import 'core/workmanager_callback.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  Workmanager().initialize(
    callbackDispatcher,
    isInDebugMode: true, // Enable for development testing
  );
  Workmanager().registerPeriodicTask(
    "1",
    "syncTask",
    frequency: const Duration(minutes: 15),
  );

  runApp(const ProviderScope(child: DcmmsApp()));
}
