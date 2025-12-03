/**
 * Push Notification Service
 *
 * Mock implementation for development/build without external dependencies (Firebase).
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class PushService {
  constructor() {
    console.log('Push service initialized (Mock Provider)');
  }

  async sendToDevice(token: string, payload: PushNotificationPayload): Promise<PushNotificationResult> {
    console.log(`[Mock Push] Sending to device ${token}: ${payload.title} - ${payload.body}`);
    return { success: true, messageId: 'mock_msg_id' };
  }

  async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<PushNotificationResult> {
    console.log(`[Mock Push] Sending to topic ${topic}: ${payload.title} - ${payload.body}`);
    return { success: true, messageId: 'mock_msg_id' };
  }

  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<PushNotificationResult> {
    console.log(`[Mock Push] Sending to user ${userId}: ${payload.title} - ${payload.body}`);
    return { success: true, messageId: 'mock_msg_id' };
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    console.log(`[Mock Push] Subscribing ${tokens.length} tokens to topic ${topic}`);
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    console.log(`[Mock Push] Unsubscribing ${tokens.length} tokens from topic ${topic}`);
  }
}

export default PushService;
