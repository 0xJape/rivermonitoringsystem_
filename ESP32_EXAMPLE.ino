/**
 * ESP32 River Water Level Sensor with SMS Alerts
 * - Ultrasonic sensor for water level (pins 14, 27)
 * - SIM800L for SMS alerts (pins 16, 17)
 * - WiFi to send data to server
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

// ------------------ WiFi SETTINGS ------------------
const char* ssid = "GoOneMore";
const char* password = "P@rtwor10.";
const char* serverUrl = "http://192.168.1.86:3001/api/esp32/reading";
const char* nodeId = "Purok 10 River"; // Changed to match database name

// ------------------ ULTRASONIC SENSOR ------------------
const int trigPin = 14;
const int echoPin = 27;
const float SENSOR_HEIGHT_CM = 200.0; // Height above riverbed - ADJUST THIS
const float MAX_DISTANCE_CM = 400.0;

// ------------------ SIM800L MODULE ------------------
HardwareSerial sim800(2); // UART2
const int simRX = 16;
const int simTX = 17;
String phoneNumber = "+639624206885"; // CHANGE THIS

// ------------------ ALERT SETTINGS ------------------
const float WARNING_LEVEL = 1.0;  // Warning at 1.0m
const float DANGER_LEVEL = 1.5;   // Danger at 1.5m
float triggerDistance = 50.0; // Alert when water level rises (distance decreases)
bool smsSent = false;
bool warningSent = false;
bool dangerSent = false;

// ------------------ TIMING ------------------
unsigned long lastServerUpdate = 0;
const int serverInterval = 3000; // Send to server every 3 seconds for live feed

long duration;
float distance;

void setup() {
  Serial.begin(9600);
  sim800.begin(9600, SERIAL_8N1, simRX, simTX);
  
  // Initialize ultrasonic sensor
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  
  Serial.println("Starting River Alert System...");
  
  // Initialize SIM800L
  delay(3000); // SIM800L boot time
  sendAT("AT");
  sendAT("AT+CMGF=1"); // SMS text mode
  Serial.println("SIM800L initialized");
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nConnected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("System ready!");
}

void loop() {
  // Read distance
  distance = readDistance();
  
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.print(" cm");
  
  // Calculate water level
  float waterLevel = (SENSOR_HEIGHT_CM - distance) / 100.0; // meters
  Serial.print(" | Water Level: ");
  Serial.print(waterLevel);
  Serial.println(" m");
  
  // SMS ALERT: If water too high (distance too low)
  if (distance <= triggerDistance && !smsSent && distance < 900) {
    String alertMsg = "⚠️ FLOOD ALERT! Water level: " + String(waterLevel, 2) + "m (Distance: " + String(distance, 1) + "cm)";
    sendSMS(alertMsg);
    smsSent = true;
  }
  
  // Reset SMS flag when water recedes
  if (distance > triggerDistance + 10) {
    smsSent = false;
  }
  
  // Send to server periodically
  if (WiFi.status() == WL_CONNECTED && millis() - lastServerUpdate >= serverInterval) {
    if (distance < 900) { // Valid reading
      sendToServer(waterLevel, distance);
    }
    lastServerUpdate = millis();
  } else if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected!");
  }
  
  delay(1000); // Send every 1 second for real-time data
}

// ------------------ FUNCTIONS ------------------
float readDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
  
  if (duration == 0) return 999; // No echo = invalid reading
  
  return (duration * 0.0343) / 2;
}

void sendToServer(float waterLevel, float distanceCm) {
  HTTPClient http;
  
  // Build JSON string manually (no library needed) - only water level
  String jsonString = "{";
  jsonString += "\"nodeId\":\"" + String(nodeId) + "\",";
  jsonString += "\"waterLevel\":" + String(waterLevel, 2);
  jsonString += "}";
  
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.print("✓ ");
  } else {
    Serial.print("✗ ");
  }
  
  http.end();
}

void sendSMS(String message) {
  Serial.println("Sending SMS...");
  
  sim800.print("AT+CMGS=\"");
  sim800.print(phoneNumber);
  sim800.println("\"");
  delay(500);
  
  sim800.print(message);
  delay(500);
  
  sim800.write(26); // CTRL+Z
  delay(3000);
  
  Serial.println("SMS Sent!");
}

void sendAT(String cmd) {
  sim800.println(cmd);
  delay(500);
  while (sim800.available()) {
    Serial.write(sim800.read());
  }
}
