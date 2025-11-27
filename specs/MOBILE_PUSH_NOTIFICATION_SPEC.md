# Mobile Push Notification Handling Specification (DCMMS-078)

Mobile app implementation for handling push notifications with foreground/background modes and deep linking.

## Overview

This specification covers how the mobile app (iOS/Android) should handle push notifications from Firebase Cloud Messaging (FCM), including foreground and background notification handling, deep linking, and user interactions.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Mobile App (React Native / Flutter / Native)           │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Notification Handler                              │ │
│  │  ├─ Foreground Handler                            │ │
│  │  ├─ Background Handler                            │ │
│  │  ├─ Notification Tap Handler                      │ │
│  │  └─ Deep Link Router                              │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
┌──────────────────────────┴──────────────────────────────┐
│  Firebase Cloud Messaging (FCM)                         │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
┌──────────────────────────┴──────────────────────────────┐
│  dCMMS Backend (Push Service)                           │
└─────────────────────────────────────────────────────────┘
```

## Push Notification Payload

### Standard Payload Structure

```json
{
  "notification": {
    "title": "Critical Alarm",
    "body": "Pump #5 - Vibration exceeds threshold (85 Hz)",
    "imageUrl": "https://app.dcmms.com/images/pump-5.jpg"
  },
  "data": {
    "type": "alarm",
    "alarmId": "uuid-123",
    "assetId": "uuid-456",
    "severity": "critical",
    "deepLink": "/alarms/uuid-123",
    "timestamp": "2025-01-15T10:30:00Z",
    "priority": "high",
    "actions": "[{\"id\":\"ack\",\"title\":\"Acknowledge\"},{\"id\":\"view\",\"title\":\"View\"}]"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "clickAction": "FLUTTER_NOTIFICATION_CLICK",
      "channelId": "alarms"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "badge": 5,
        "sound": "default",
        "contentAvailable": true,
        "category": "ALARM_CATEGORY"
      }
    }
  }
}
```

### Notification Types

1. **Critical Alarm**
   ```json
   {
     "type": "alarm",
     "severity": "critical",
     "deepLink": "/alarms/:id"
   }
   ```

2. **Work Order Assignment**
   ```json
   {
     "type": "work_order",
     "priority": "high",
     "deepLink": "/work-orders/:id"
   }
   ```

3. **General Notification**
   ```json
   {
     "type": "notification",
     "deepLink": "/notifications"
   }
   ```

## Mobile Implementation

### 1. Device Token Registration

When user logs in or app starts:

```typescript
// React Native with @react-native-firebase/messaging

import messaging from '@react-native-firebase/messaging';

async function registerDeviceToken() {
  // Request permission (iOS)
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    // Get FCM token
    const token = await messaging().getToken();

    // Register token with backend
    await fetch('/api/v1/users/me/device-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS, // 'ios' or 'android'
      }),
    });

    console.log('Device token registered:', token);
  }
}

// Listen for token refresh
messaging().onTokenRefresh(async (token) => {
  await registerDeviceToken();
});
```

### 2. Foreground Notification Handling

When app is **open and in foreground**:

```typescript
import messaging from '@react-native-firebase/messaging';
import { showNotificationBanner } from './notifications';

// Handle foreground notifications
messaging().onMessage(async (remoteMessage) => {
  console.log('Foreground notification:', remoteMessage);

  const { notification, data } = remoteMessage;

  // Show in-app banner/toast
  showNotificationBanner({
    title: notification?.title,
    body: notification?.body,
    onPress: () => handleDeepLink(data?.deepLink),
  });

  // Update badge count
  if (notification?.badge) {
    updateBadgeCount(notification.badge);
  }

  // Play sound (optional)
  if (data?.severity === 'critical') {
    playAlarmSound();
  }

  // Update in-app notification list
  addToNotificationList(remoteMessage);
});
```

### 3. Background Notification Handling

When app is **in background or killed**:

```typescript
// Background handler (runs in isolated context)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background notification:', remoteMessage);

  const { data } = remoteMessage;

  // Process data payload (data-only notifications)
  // Can update local database, trigger background sync, etc.

  // For critical alarms, could trigger local notification
  if (data?.severity === 'critical') {
    await showLocalNotification({
      title: data.title,
      body: data.body,
      data: data,
    });
  }

  return Promise.resolve();
});
```

### 4. Notification Tap Handling

When user **taps notification**:

```typescript
import messaging from '@react-native-firebase/messaging';
import { useNavigation } from '@react-navigation/native';

function App() {
  const navigation = useNavigation();

  useEffect(() => {
    // Handle notification tap when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification tapped (background):', remoteMessage);
      handleDeepLink(remoteMessage.data?.deepLink, navigation);
    });

    // Handle notification tap when app was killed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification tapped (killed):', remoteMessage);
          handleDeepLink(remoteMessage.data?.deepLink, navigation);
        }
      });
  }, []);

  return <AppContent />;
}
```

### 5. Deep Link Routing

```typescript
interface DeepLinkRoute {
  path: string;
  screen: string;
  params?: Record<string, any>;
}

function handleDeepLink(deepLink: string | undefined, navigation: any) {
  if (!deepLink) return;

  const route = parseDeepLink(deepLink);
  if (!route) {
    console.warn('Invalid deep link:', deepLink);
    return;
  }

  // Navigate to screen
  navigation.navigate(route.screen, route.params);

  // Track analytics
  trackDeepLinkOpen(deepLink);
}

function parseDeepLink(deepLink: string): DeepLinkRoute | null {
  // Remove leading slash
  const path = deepLink.replace(/^\//, '');

  // Parse routes
  if (path.startsWith('alarms/')) {
    const alarmId = path.split('/')[1];
    return {
      path,
      screen: 'AlarmDetail',
      params: { alarmId },
    };
  }

  if (path.startsWith('work-orders/')) {
    const workOrderId = path.split('/')[1];
    return {
      path,
      screen: 'WorkOrderDetail',
      params: { workOrderId },
    };
  }

  if (path === 'notifications') {
    return {
      path,
      screen: 'Notifications',
    };
  }

  if (path.startsWith('assets/')) {
    const assetId = path.split('/')[1];
    return {
      path,
      screen: 'AssetDetail',
      params: { assetId },
    };
  }

  return null;
}
```

### 6. Notification Actions (iOS)

iOS supports notification actions via UNNotificationCategory:

```swift
// iOS Native (AppDelegate.swift)

import UserNotifications

func application(
  _ application: UIApplication,
  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
  // Define notification categories and actions
  let acknowledgeAction = UNNotificationAction(
    identifier: "ACKNOWLEDGE_ACTION",
    title: "Acknowledge",
    options: [.foreground]
  )

  let viewAction = UNNotificationAction(
    identifier: "VIEW_ACTION",
    title: "View",
    options: [.foreground]
  )

  let alarmCategory = UNNotificationCategory(
    identifier: "ALARM_CATEGORY",
    actions: [acknowledgeAction, viewAction],
    intentIdentifiers: [],
    options: []
  )

  UNUserNotificationCenter.current().setNotificationCategories([alarmCategory])

  return true
}

// Handle action response
func userNotificationCenter(
  _ center: UNUserNotificationCenter,
  didReceive response: UNNotificationResponse,
  withCompletionHandler completionHandler: @escaping () -> Void
) {
  let userInfo = response.notification.request.content.userInfo

  switch response.actionIdentifier {
  case "ACKNOWLEDGE_ACTION":
    let alarmId = userInfo["alarmId"] as? String
    acknowledgeAlarm(alarmId: alarmId)

  case "VIEW_ACTION":
    let deepLink = userInfo["deepLink"] as? String
    openDeepLink(deepLink: deepLink)

  default:
    break
  }

  completionHandler()
}
```

### 7. Android Notification Channels

```kotlin
// Android Native (MainActivity.kt)

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

fun createNotificationChannels() {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    val notificationManager = getSystemService(NotificationManager::class.java)

    // Critical Alarms Channel
    val criticalChannel = NotificationChannel(
      "alarms",
      "Critical Alarms",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Critical alarm notifications"
      enableVibration(true)
      enableLights(true)
      setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
        null
      )
    }

    // Work Orders Channel
    val workOrdersChannel = NotificationChannel(
      "work_orders",
      "Work Orders",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "Work order assignments and updates"
    }

    // General Channel
    val generalChannel = NotificationChannel(
      "general",
      "General Notifications",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "General app notifications"
    }

    notificationManager.createNotificationChannels(
      listOf(criticalChannel, workOrdersChannel, generalChannel)
    )
  }
}
```

### 8. Badge Count Management

```typescript
import { setBadge } from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';

async function updateBadgeCount(count: number) {
  if (Platform.OS === 'ios') {
    setBadge(count);
  } else {
    // Android - update app icon badge
    PushNotification.setApplicationIconBadgeNumber(count);
  }

  // Sync with backend
  await fetch('/api/v1/users/me/notification-badge', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
}

async function clearBadge() {
  await updateBadgeCount(0);
}
```

### 9. Silent Notifications (Background Data Sync)

For background data sync without showing notification:

```typescript
// Backend sends silent notification
const silentNotification = {
  data: {
    type: 'sync',
    syncType: 'alarms',
    silent: 'true',
  },
  apns: {
    payload: {
      aps: {
        contentAvailable: true, // iOS background fetch
      },
    },
  },
  android: {
    priority: 'high',
  },
};

// Mobile app handles silent notification
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (remoteMessage.data?.silent === 'true') {
    // Perform background sync
    await syncAlarms();
    return Promise.resolve();
  }
});
```

## Notification Preferences in Mobile App

### Settings Screen

```typescript
// app/screens/NotificationSettingsScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Switch } from 'react-native';

export default function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState({
    critical_alarms: true,
    warning_alarms: true,
    work_orders: true,
    sound_enabled: true,
    vibration_enabled: true,
  });

  const togglePreference = async (key: string, value: boolean) => {
    setPreferences({ ...preferences, [key]: value });

    // Save to backend
    await fetch('/api/v1/users/me/notification-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
  };

  return (
    <View>
      <Text>Push Notification Settings</Text>

      <View>
        <Text>Critical Alarms</Text>
        <Switch
          value={preferences.critical_alarms}
          onValueChange={(value) => togglePreference('critical_alarms', value)}
        />
      </View>

      <View>
        <Text>Warning Alarms</Text>
        <Switch
          value={preferences.warning_alarms}
          onValueChange={(value) => togglePreference('warning_alarms', value)}
        />
      </View>

      <View>
        <Text>Work Orders</Text>
        <Switch
          value={preferences.work_orders}
          onValueChange={(value) => togglePreference('work_orders', value)}
        />
      </View>

      <View>
        <Text>Sound</Text>
        <Switch
          value={preferences.sound_enabled}
          onValueChange={(value) => togglePreference('sound_enabled', value)}
        />
      </View>

      <View>
        <Text>Vibration</Text>
        <Switch
          value={preferences.vibration_enabled}
          onValueChange={(value) => togglePreference('vibration_enabled', value)}
        />
      </View>
    </View>
  );
}
```

## Testing Checklist

### iOS Testing
- [ ] Device token registration works
- [ ] Foreground notifications display in-app banner
- [ ] Background notifications show system notification
- [ ] Tapping notification opens correct screen
- [ ] Deep links navigate to correct content
- [ ] Badge count updates correctly
- [ ] Notification actions (Acknowledge, View) work
- [ ] Sound plays for critical alarms
- [ ] Silent notifications trigger background sync
- [ ] Permissions requested on first launch

### Android Testing
- [ ] Device token registration works
- [ ] Foreground notifications display in-app banner
- [ ] Background notifications show system notification
- [ ] Tapping notification opens correct screen
- [ ] Deep links navigate to correct content
- [ ] Badge count updates correctly
- [ ] Notification channels created correctly
- [ ] Sound plays for critical alarms
- [ ] Silent notifications trigger background sync
- [ ] Permissions requested on first launch

## Analytics & Monitoring

Track the following events:
- `push_notification_received` - Notification received
- `push_notification_opened` - User tapped notification
- `push_notification_dismissed` - User dismissed notification
- `push_notification_action` - User tapped action button
- `deep_link_opened` - Deep link navigated

## Backend API Endpoints

### POST /api/v1/users/me/device-tokens
Register device token.

### DELETE /api/v1/users/me/device-tokens/:token
Unregister device token.

### PUT /api/v1/users/me/notification-badge
Update badge count.

### GET /api/v1/users/me/notification-preferences
Get push notification preferences.

### PUT /api/v1/users/me/notification-preferences
Update push notification preferences.

## Security Considerations

1. **Token Security:** Store device tokens securely, never expose in logs
2. **Payload Validation:** Validate notification payload before processing
3. **Deep Link Validation:** Validate deep links to prevent malicious navigation
4. **Authentication:** Ensure user is authenticated before registering token
5. **Token Rotation:** Handle token refresh and cleanup old tokens

## Future Enhancements

1. **Rich Notifications:** Images, videos, maps in notifications
2. **Notification Groups:** Group related notifications (e.g., multiple alarms)
3. **Quick Actions:** More contextual actions (Snooze, Assign, etc.)
4. **Custom Sounds:** Per-notification-type custom sounds
5. **Notification Scheduling:** Schedule notifications for specific times
6. **Geofencing:** Location-based notification triggers
7. **Notification History:** In-app notification history viewer
8. **Do Not Disturb:** Respect system DND settings
