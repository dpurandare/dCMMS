# dCMMS Mobile App - Developer Guide

## Overview

The dCMMS Mobile App is a Flutter-based cross-platform application designed for field technicians to manage work orders, assets, and maintenance tasks with offline-first capabilities.

**Version:** 1.0.0  
**Flutter SDK:** ^3.10.3  
**Platforms:** Android, iOS, Linux, macOS, Windows, Web

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Key Technologies](#key-technologies)
- [Development Workflow](#development-workflow)
- [Building & Deployment](#building--deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Flutter SDK** (3.10.3 or higher)
   ```bash
   # Install Flutter (https://flutter.dev/docs/get-started/install)
   flutter --version
   ```

2. **Platform-Specific Tools**
   - **Android:** Android Studio + Android SDK (API 21+)
   - **iOS:** Xcode 14+ (macOS only)
   - **Desktop:** Platform-specific development tools

3. **Code Editor**
   - VS Code with Flutter/Dart extensions (recommended)
   - Android Studio with Flutter plugin
   - IntelliJ IDEA with Flutter plugin

### Backend Dependencies

The mobile app requires the dCMMS backend to be running:

```bash
# Start backend (see main README.md)
cd backend
npm run dev

# Or use Docker
docker compose up -d backend
```

**Backend URL:** http://localhost:3001 (default)

---

## Installation

### 1. Clone and Navigate

```bash
git clone https://github.com/yourusername/dCMMS.git
cd dCMMS/mobile
```

### 2. Install Dependencies

```bash
# Get Flutter packages
flutter pub get

# Generate Drift database code
flutter pub run build_runner build --delete-conflicting-outputs
```

### 3. Configure Environment

The app connects to the backend API. The default configuration points to `localhost`:

```dart
// lib/core/network/api_client.dart
const baseUrl = 'http://localhost:3001/api/v1';
```

For device testing, update to your computer's IP:
```dart
const baseUrl = 'http://192.168.1.100:3001/api/v1';  // Replace with your IP
```

### 4. Verify Installation

```bash
# Check for issues
flutter doctor

# Run on connected device/emulator
flutter run
```

---

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── app.dart                  # App widget & theme
│   ├── core/                     # Core utilities
│   │   ├── auth/                 # Authentication
│   │   ├── database/             # Drift SQLite database
│   │   │   ├── database.dart     # Database definition
│   │   │   ├── tables.dart       # Table schemas
│   │   │   └── daos/             # Data access objects
│   │   ├── network/              # API client (Dio)
│   │   ├── router.dart           # GoRouter navigation
│   │   ├── providers.dart        # Riverpod providers
│   │   ├── theme/                # App theming
│   │   └── workmanager_callback.dart  # Background sync
│   ├── features/                 # Feature modules
│   │   ├── auth/                 # Login, logout
│   │   ├── work_orders/          # Work order management
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── genai/                # GenAI integration
│   │   └── sync/                 # Offline sync
├── test/                         # Unit & widget tests
├── android/                      # Android-specific config
├── ios/                          # iOS-specific config
├── pubspec.yaml                  # Dependencies
└── README.md                     # Quick reference
```

### Key Directories

- **`lib/core/`** - Shared utilities, auth, database, networking
- **`lib/features/`** - Feature-based modules (work orders, dashboard, etc.)
- **`test/`** - Automated tests

---

## Key Technologies

### Core Stack

| Technology   | Purpose                   | Version     |
| ------------ | ------------------------- | ----------- |
| **Flutter**  | Cross-platform framework  | SDK 3.10.3+ |
| **Dart**     | Programming language      | 3.10.3+     |
| **Riverpod** | State management          | 3.0.3       |
| **GoRouter** | Navigation                | 17.0.1      |
| **Drift**    | SQLite database (offline) | 2.30.0      |
| **Dio**      | HTTP client               | 5.9.0       |

### Key Packages

| Package                  | Purpose                         |
| ------------------------ | ------------------------------- |
| `flutter_riverpod`       | State management with providers |
| `go_router`              | Declarative routing             |
| `drift`                  | Type-safe SQL database          |
| `sqlite3_flutter_libs`   | SQLite native libraries         |
| `dio`                    | REST API communication          |
| `connectivity_plus`      | Network status monitoring       |
| `flutter_secure_storage` | Secure credential storage       |
| `workmanager`            | Background sync tasks           |
| `google_fonts`           | Typography                      |
| `flutter_animate`        | Animations                      |
| `file_picker`            | File uploads                    |

---

## Development Workflow

### Running the App

```bash
# Run on default device
flutter run

# Run on specific device
flutter devices  # List devices
flutter run -d <device-id>

# Run with specific flavor
flutter run --flavor development
flutter run --flavor production

# Hot reload (press 'r' in terminal while running)
# Hot restart (press 'R')
```

### Code Generation

The app uses code generation for Drift database and Riverpod:

```bash
# Generate code (run after modifying database schema)
flutter pub run build_runner build --delete-conflicting-outputs

# Watch mode (auto-generate on save)
flutter pub run build_runner watch
```

### Debugging

```bash
# Enable debug mode
flutter run --debug

# Enable verbose logging
flutter run -v

# Profile mode (performance testing)
flutter run --profile

# DevTools
flutter pub global activate devtools
flutter pub global run devtools
```

### State Management (Riverpod)

```dart
// Define a provider
final workOrdersProvider = StateNotifierProvider<WorkOrdersNotifier, List<WorkOrder>>((ref) {
  return WorkOrdersNotifier();
});

// Use in widget
class WorkOrderList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workOrders = ref.watch(workOrdersProvider);
    
    return ListView.builder(
      itemCount: workOrders.length,
      itemBuilder: (context, index) => WorkOrderCard(workOrders[index]),
    );
  }
}
```

### Offline Database (Drift)

```dart
// Define table
class WorkOrders extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get title => text()();
  DateTimeColumn get createdAt => dateTime()();
}

// Query with DAO
final workOrders = await database.workOrdersDao.getAllWorkOrders();

// Insert
await database.workOrdersDao.insertWorkOrder(workOrder);
```

---

## Building & Deployment

### Android

```bash
# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release

# App Bundle (for Play Store)
flutter build appbundle --release

# Install on device
flutter install
```

**Output:** `build/app/outputs/flutter-apk/app-release.apk`

### iOS

```bash
# Build for iOS
flutter build ios --release

# Build and archive (requires Xcode)
open ios/Runner.xcworkspace  # Then archive in Xcode
```

### Desktop

```bash
# Linux
flutter build linux --release

# macOS
flutter build macos --release

# Windows
flutter build windows --release
```

### Web

```bash
# Build web
flutter build web --release

# Serve locally
flutter run -d chrome
```

---

## Testing

### Run Tests

```bash
# All tests
flutter test

# Specific test file
flutter test test/work_order_repository_test.dart

# With coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

### Test Types

```dart
// Unit test
test('WorkOrder creation', () {
  final wo = WorkOrder(title: 'Test');
  expect(wo.title, 'Test');
});

// Widget test
testWidgets('Login button test', (WidgetTester tester) async {
  await tester.pumpWidget(LoginScreen());
  expect(find.text('Login'), findsOneWidget);
  await tester.tap(find.text('Login'));
  await tester.pump();
});

// Integration test
testWidgets('Full login flow', (WidgetTester tester) async {
  await tester.pumpWidget(MyApp());
  await tester.enterText(find.byKey(Key('email')), 'admin@example.com');
  await tester.enterText(find.byKey(Key('password')), 'Password123!');
  await tester.tap(find.text('Login'));
  await tester.pumpAndSettle();
  expect(find.text('Dashboard'), findsOneWidget);
});
```

---

## Troubleshooting

### Common Issues

#### 1. Build Runner Errors

```bash
# Clear generated files and rebuild
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

#### 2. Platform-Specific Build Issues

**Android:**
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

**iOS:**
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter clean
flutter pub get
flutter run
```

#### 3. Network Connection Issues

If the app can't connect to backend:
- Check backend is running: `curl http://localhost:3001/health`
- Update API baseUrl to your machine's IP (not `localhost` for physical devices)
- Check firewall settings
- Verify network connectivity

#### 4. Database Migration Issues

```bash
# Reset database
flutter clean
rm -rf build/
flutter pub run build_runner clean
flutter pub run build_runner build --delete-conflicting-outputs
```

#### 5. State Not Updating

```dart
// Force refresh provider
ref.refresh(workOrdersProvider);

// Invalidate provider
ref.invalidate(workOrdersProvider);

// Read once (doesn't listen)
final value = ref.read(workOrdersProvider);
```

### Debug Commands

```bash
# Flutter doctor (check environment)
flutter doctor -v

# Clear cache
flutter clean

# Analyze code
flutter analyze

# Format code
flutter format lib/

# Check outdated packages
flutter pub outdated
```

---

## Additional Resources

- **Main Documentation:** `/docs/mobile/architecture.md`
- **Feature Guide:** `/docs/mobile/features.md`
- **Build & Deploy:** `/docs/mobile/build-deployment.md`
- **Backend API:** `http://localhost:3001/docs` (Swagger)
- **Flutter Docs:** https://flutter.dev/docs
- **Riverpod Docs:** https://riverpod.dev
- **Drift Docs:** https://drift.simonbinder.eu

---

## Quick Reference

```bash
# Setup
flutter pub get
flutter pub run build_runner build

# Run
flutter run
flutter run -d chrome  # Web
flutter run --profile  # Performance

# Build
flutter build apk --release
flutter build ios --release
flutter build web --release

# Test
flutter test
flutter test --coverage

# Maintain
flutter clean
flutter pub upgrade
flutter analyze
```

---

## Support

For issues or questions:
1. Check existing documentation in `/docs/mobile/`
2. Review backend API docs at `http://localhost:3001/docs`
3. Check Flutter logs: `flutter logs`
4. Review GitHub issues
