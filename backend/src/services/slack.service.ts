/**
 * Slack Notification Service
 *
 * Mock implementation for development/build without external dependencies.
 */

export interface SlackMessageOptions {
  channel: string;
  text: string;
  blocks?: Record<string, unknown>[];
  threadTs?: string;
  attachments?: Record<string, unknown>[];
}

export interface SlackResult {
  success: boolean;
  messageTs?: string;
  channel?: string;
  error?: string;
}

export interface SlackAlarmMessage {
  alarmId: string;
  severity: "critical" | "warning" | "info";
  assetName: string;
  siteName: string;
  sensorType: string;
  value: number;
  unit: string;
  threshold: number;
  timestamp: string;
  appUrl: string;
}

export interface SlackWorkOrderMessage {
  workOrderId: string;
  title: string;
  priority: "high" | "medium" | "low";
  assignedTo: string;
  dueDate: string;
  assetName: string;
  appUrl: string;
}

export class SlackService {
  constructor() {
    console.log("Slack service initialized (Mock Provider)");
  }

  async sendMessage(channel: string, text: string): Promise<SlackResult> {
    console.log(
      `[Mock Slack] Sending message to channel: ${channel}, text: "${text}"`,
    );
    return { success: true, messageTs: "mock_ts", channel: channel };
  }

  async sendBlockMessage(options: SlackMessageOptions): Promise<SlackResult> {
    console.log(
      `[Mock Slack] Sending block message to channel: ${options.channel}, text: "${options.text}"`,
    );
    return { success: true, messageTs: "mock_ts", channel: options.channel };
  }

  async sendAlarmNotification(
    channel: string,
    alarm: SlackAlarmMessage,
  ): Promise<SlackResult> {
    console.log(
      `[Mock Slack] Sending alarm notification to channel: ${channel}, alarm: ${alarm.alarmId}`,
    );
    return { success: true, messageTs: "mock_ts", channel: channel };
  }

  async sendWorkOrderNotification(
    channel: string,
    workOrder: SlackWorkOrderMessage,
  ): Promise<SlackResult> {
    console.log(
      `[Mock Slack] Sending work order notification to channel: ${channel}, workOrder: ${workOrder.workOrderId}`,
    );
    return { success: true, messageTs: "mock_ts", channel: channel };
  }

  async updateMessage(
    channel: string,
    messageTs: string,
    _text: string,
    _blocks?: Record<string, unknown>[],
  ): Promise<SlackResult> {
    console.log(
      `[Mock Slack] Updating message in channel: ${channel}, ts: ${messageTs}`,
    );
    return { success: true, messageTs: messageTs, channel: channel };
  }

  async getUserByEmail(
    _email: string,
  ): Promise<{ id: string; name: string } | null> {
    return { id: "mock_user_id", name: "Mock User" };
  }

  async getChannelByName(_name: string): Promise<string | null> {
    return "mock_channel_id";
  }

  verifySlackRequest(
    _requestBody: string,
    _timestamp: string,
    _signature: string,
  ): boolean {
    return true;
  }

  async handleInteractiveAction(_payload: unknown): Promise<void> {
    console.log("[Mock Slack] Handling interactive action");
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

export default SlackService;
