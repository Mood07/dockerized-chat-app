const { Kafka } = require("kafkajs");

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "chat-messages";

let _kafka;
let _producer;
let _consumer;

function createKafka() {
  if (_kafka) return _kafka;
  _kafka = new Kafka({
    clientId: "chat-backend",
    brokers: [KAFKA_BROKER],
    retry: { initialRetryTime: 300, retries: 10 },
  });
  return _kafka;
}

async function initKafka() {
  const kafka = createKafka();
  if (!_producer) {
    _producer = kafka.producer();
    await _producer.connect();
  }
  if (!_consumer) {
    _consumer = kafka.consumer({ groupId: "chat-group" });
    await _consumer.connect();
    await _consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
  }
  return { producer: _producer, consumer: _consumer, topic: KAFKA_TOPIC };
}

function getProducer() {
  if (!_producer) throw new Error("Kafka producer not initialized");
  return _producer;
}

function getConsumer() {
  if (!_consumer) throw new Error("Kafka consumer not initialized");
  return _consumer;
}

module.exports = {
  initKafka,
  getProducer,
  getConsumer,
  KAFKA_TOPIC,
};

