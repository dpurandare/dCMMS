import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dcmms_mobile/app.dart';

void main() {
  testWidgets('Smoke test - App starts', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: DcmmsApp(),
      ),
    );

    // Verify that the app title is displayed
    expect(find.text('dCMMS Offline Mobile App'), findsOneWidget);
  });
}
