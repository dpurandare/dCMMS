# dCMMS Mobile App - Build & Deployment Guide

## Overview

This guide covers building and deploying the dCMMS Mobile App for all supported platforms.

---

## Table of Contents

- [Build Configurations](#build-configurations)
- [Android Deployment](#android-deployment)
- [iOS Deployment](#ios-deployment)
- [Desktop Deployment](#desktop-deployment)
- [Web Deployment](#web-deployment)
- [CI/CD Integration](#cicd-integration)

---

## Build Configurations

### Environment Setup

The app supports different build environments:

1. **Development** - Local testing with dev backend
2. **Staging** - Pre-production testing
3. **Production** - Live deployment

**Configuration File:** `lib/core/config/environment.dart`

```dart
class Environment {
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3001/api/v1',
  );
  
  static const bool enableLogging = bool.fromEnvironment(
    'ENABLE_LOGGING',
    defaultValue: true,
  );
}
```

### Build Commands

```bash
# Development build
flutter build <platform> --dart-define=API_URL=http://localhost:3001/api/v1

# Staging build
flutter build <platform> --dart-define=API_URL=https://staging-api.dcmms.com/api/v1

# Production build
flutter build <platform> --dart-define=API_URL=https://api.dcmms.com/api/v1 --dart-define=ENABLE_LOGGING=false
```

---

## Android Deployment

### Prerequisites

1. Android Studio with Android SDK
2. Java Development Kit (JDK) 17+
3. Signing keys for release builds

### Debug Build

```bash
# Build APK
flutter build apk --debug

# Install on connected device
flutter install

# Output location
# build/app/outputs/flutter-apk/app-debug.apk
```

### Release Build

#### 1. Configure Signing

Create `android/key.properties`:

```properties
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=dcmms
storeFile=<path-to-keystore>
```

**Generate Keystore:**
```bash
keytool -genkey -v -keystore dcmms-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias dcmms
```

#### 2. Update `android/app/build.gradle`

```gradle
android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### 3. Build Release APK

```bash
# Build APK
flutter build apk --release

# Output: build/app/outputs/flutter-apk/app-release.apk
```

#### 4. Build App Bundle (for Play Store)

```bash
# Build AAB
flutter build appbundle --release

# Output: build/app/outputs/bundle/release/app-release.aab
```

### Play Store Deployment

1. **Create Play Store Listing**
   - App name: dCMMS Mobile
   - Category: Business
   - Screenshots, descriptions, etc.

2. **Upload Release**
   - Go to Google Play Console
   - Create new release
   - Upload `app-release.aab`
   - Complete rollout

3. **Version Management**
   
   Update `pubspec.yaml`:
   ```yaml
   version: 1.0.1+2  # version+build number
   ```

---

## iOS Deployment

### Prerequisites

1. macOS with Xcode 14+
2. Apple Developer Account
3. iOS device or simulator

### Debug Build

```bash
# Build for iOS
flutter build ios --debug

# Run on simulator
flutter run -d ios

# Run on device
flutter run -d <device-id>
```

### Release Build

#### 1. Configure Xcode Project

```bash
# Open Xcode
open ios/Runner.xcworkspace
```

**In Xcode:**
1. Select Runner → Signing & Capabilities
2. Set Team and Bundle Identifier
3. Enable Automatic Signing or configure Provisioning Profiles

#### 2. Build Archive

```bash
# Build for release
flutter build ios --release

# Or build in Xcode
# Product → Archive
```

#### 3. App Store Connect

1. **Create App Listing**
   - Log in to App Store Connect
   - Create new app
   - Fill in metadata

2. **Upload Build**
   ```bash
   # From Xcode
   # Window → Organizer → Upload to App Store
   ```

3. **Submit for Review**
   - Select build
   - Complete questionnaire
   - Submit for review

### TestFlight Distribution

```bash
# Build for TestFlight
flutter build ipa --release

# Upload via Xcode Organizer or Transporter app
```

---

## Desktop Deployment

### Linux

```bash
# Build
flutter build linux --release

# Output
# build/linux/x64/release/bundle/

# Create installer (optional)
# Use tools like AppImage or Snapcraft
```

**Run Executable:**
```bash
cd build/linux/x64/release/bundle/
./dcmms_mobile
```

### macOS

```bash
# Build
flutter build macos --release

# Output
# build/macos/Build/Products/Release/dcmms_mobile.app

# Create DMG (optional)
# Use create-dmg or other packaging tools
```

### Windows

```bash
# Build
flutter build windows --release

# Output
# build/windows/x64/runner/Release/

# Create installer (optional)
# Use Inno Setup or NSIS
```

---

## Web Deployment

### Build for Web

```bash
# Production build
flutter build web --release

# Output: build/web/
```

### Deployment Options

#### 1. Static Hosting (Firebase, Netlify, Vercel)

**Firebase:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize
firebase init hosting

# Deploy
firebase deploy --only hosting
```

**Netlify/Vercel:**
```bash
# Build
flutter build web

# Upload build/web/ directory
# Or connect Git repository for auto-deploy
```

#### 2. Self-Hosted (Nginx, Apache)

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name mobile.dcmms.com;
    
    root /var/www/dcmms-mobile;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Deploy:**
```bash
# Copy build files
flutter build web --release
scp -r build/web/* user@server:/var/www/dcmms-mobile/

# Restart Nginx
ssh user@server 'sudo systemctl restart nginx'
```

---

## CI/CD Integration

### GitHub Actions

`.github/workflows/mobile.yml`:

```yaml
name: Mobile CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.10.3'
      
      - name: Get dependencies
        working-directory: ./mobile
        run: flutter pub get
      
      - name: Run code generation
        working-directory: ./mobile
        run: flutter pub run build_runner build --delete-conflicting-outputs
      
      - name: Run tests
        working-directory: ./mobile
        run: flutter test
      
      - name: Analyze
        working-directory: ./mobile
        run: flutter analyze
      
      - name: Build APK
        working-directory: ./mobile
        run: flutter build apk --release
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release.apk
          path: mobile/build/app/outputs/flutter-apk/app-release.apk
```

### GitLab CI

`.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: cirrusci/flutter:3.10.3
  script:
    - cd mobile
    - flutter pub get
    - flutter pub run build_runner build
    - flutter analyze
    - flutter test

build_android:
  stage: build
  image: cirrusci/flutter:3.10.3
  script:
    - cd mobile
    - flutter build apk --release
  artifacts:
    paths:
      - mobile/build/app/outputs/flutter-apk/app-release.apk

build_ios:
  stage: build
  tags:
    - macos
  script:
    - cd mobile
    - flutter build ios --release --no-codesign
  artifacts:
    paths:
      - mobile/build/ios/iphoneos/Runner.app
```

---

## Version Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH+BUILD`

```yaml
# pubspec.yaml
version: 1.2.3+45
```

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes
- **BUILD:** Build number (auto-increment)

### Update Version

```bash
# Manually in pubspec.yaml
version: 1.1.0+2

# Or use version tool
flutter pub run version
```

### Changelog

Maintain `CHANGELOG.md`:

```markdown
# Changelog

## [1.1.0] - 2025-12-24
### Added
- GenAI chat integration
- Dashboard customization

### Fixed
- Offline sync stability issues
- Login token refresh

### Changed
- Updated design system
```

---

## Distribution Channels

### Beta Testing

**Android - Firebase App Distribution:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Build and upload
flutter build apk --release
firebase appdistribution:distribute \
  build/app/outputs/flutter-apk/app-release.apk \
  --app <firebase-app-id> \
  --groups "beta-testers"
```

**iOS - TestFlight:**
```bash
# Upload via Xcode or Transporter
# Invite internal/external testers via App Store Connect
```

### Production Release

**Android Play Store:**
1. Build AAB: `flutter build appbundle --release`
2. Upload to Play Console
3. Complete store listing
4. Submit for review

**iOS App Store:**
1. Build IPA: `flutter build ipa --release`
2. Upload via Xcode Organizer
3. Complete App Store Connect listing
4. Submit for review

---

## Environment Variables

### Build-time Variables

```bash
# Pass via --dart-define
flutter build apk --dart-define=API_URL=https://api.dcmms.com/api/v1
```

### Runtime Configuration

```dart
// lib/core/config/environment.dart
class Environment {
  static String get apiUrl => _apiUrl;
  
  static void configure({required String apiUrl}) {
    _apiUrl = apiUrl;
  }
  
  static String _apiUrl = 'http://localhost:3001/api/v1';
}

// In main.dart
void main() {
  Environment.configure(
    apiUrl: const String.fromEnvironment('API_URL'),
  );
  runApp(MyApp());
}
```

---

## Security Considerations

### Code Obfuscation

```bash
# Enable obfuscation for release builds
flutter build apk --obfuscate --split-debug-info=build/debug-info
flutter build ios --obfuscate --split-debug-info=build/debug-info
```

### API Keys

**Never commit API keys!**

```dart
// Use dart-define
const googleMapsApiKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');

// Build command
flutter build apk --dart-define=GOOGLE_MAPS_API_KEY=your_key_here
```

### SSL Pinning

```dart
// lib/core/network/api_client.dart
(dio.httpClientAdapter as DefaultHttpClientAdapter).onHttpClientCreate = (client) {
  client.badCertificateCallback = (X509Certificate cert, String host, int port) {
    return cert.pem == expectedPEM;  // Pin certificate
  };
  return client;
};
```

---

## Troubleshooting

### Common Build Issues

**Gradle Build Failed:**
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter build apk
```

**iOS Build Failed:**
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter clean
flutter pub get
flutter build ios
```

**Code Generation Failed:**
```bash
flutter pub run build_runner clean
flutter packages pub run build_runner build --delete-conflicting-outputs
```

---

## Performance Optimization

### Build Optimization

```bash
# Split ABIs (Android)
flutter build apk --split-per-abi --release

# Tree-shake icons
flutter build <platform> --tree-shake-icons

# Reduce app size
flutter build <platform> --release --shrink
```

### Profile Build

```bash
# Profile build for performance testing
flutter build <platform> --profile
flutter run --profile
```

---

## Quick Reference

```bash
# Android
flutter build apk --release                    # APK
flutter build appbundle --release              # AAB (Play Store)

# iOS
flutter build ios --release                    # iOS build
flutter build ipa --release                    # IPA (App Store)

# Desktop
flutter build linux --release                  # Linux
flutter build macos --release                  # macOS
flutter build windows --release                # Windows

# Web
flutter build web --release                    # Web

# With environment
flutter build apk --dart-define=API_URL=https://api.dcmms.com/api/v1
```

---

## Additional Resources

- [Android Publishing Guide](https://docs.flutter.dev/deployment/android)
- [iOS Publishing Guide](https://docs.flutter.dev/deployment/ios)  
- [Web Deployment](https://docs.flutter.dev/deployment/web)
- [CI/CD Best Practices](https://docs.flutter.dev/deployment/cd)
