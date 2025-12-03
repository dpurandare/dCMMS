import { Kafka, Producer, ProducerRecord, logLevel } from "kafkajs";

/**
 * Kafka Service for Publishing Telemetry Events
 *
 * Handles connection to Kafka broker and publishing messages
 * to telemetry topics.
 */
class KafkaService {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Kafka client and producer
   */
  private initialize() {
    try {
      const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(
        ",",
      );

      this.kafka = new Kafka({
        clientId: "dcmms-backend",
        brokers,
        logLevel: logLevel.ERROR,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });

      this.producer = this.kafka.producer({
        allowAutoTopicCreation: false,
        transactionTimeout: 30000,
        maxInFlightRequests: 5,
        idempotent: true,
      });

      console.log("Kafka service initialized");
    } catch (error) {
      console.error("Failed to initialize Kafka:", error);
    }
  }

  /**
   * Connect to Kafka broker
   */
  async connect(): Promise<void> {
    if (this.isConnected || !this.producer) {
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log("✓ Connected to Kafka");
    } catch (error) {
      console.error("Failed to connect to Kafka:", error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka broker
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.producer) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log("✓ Disconnected from Kafka");
    } catch (error) {
      console.error("Failed to disconnect from Kafka:", error);
    }
  }

  /**
   * Publish telemetry events to Kafka
   *
   * @param topic - Kafka topic name (e.g., 'raw_telemetry')
   * @param messages - Array of telemetry events
   * @returns Promise with send results
   */
  async publishTelemetry(topic: string, messages: any[]): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.producer) {
      throw new Error("Kafka producer not initialized");
    }

    try {
      const kafkaMessages = messages.map((msg) => ({
        key: `${msg.site_id}:${msg.asset_id}:${msg.sensor_id}`,
        value: JSON.stringify(msg),
        timestamp: msg.timestamp?.toString(),
      }));

      const result = await this.producer.send({
        topic,
        messages: kafkaMessages,
        compression: 1, // LZ4 compression
      });

      console.log(`Published ${messages.length} messages to ${topic}`);
      return result;
    } catch (error) {
      console.error(`Failed to publish to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Publish single telemetry event (convenience method)
   */
  async publishSingleEvent(topic: string, event: any): Promise<any> {
    return this.publishTelemetry(topic, [event]);
  }

  /**
   * Check if Kafka is connected
   */
  isKafkaConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const kafkaService = new KafkaService();
