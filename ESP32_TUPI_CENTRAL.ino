/**
 * ESP32 Water Level Sensor with SIM800L SMS
 * For Tupi Central River Monitoring Station
 * 
 * Hardware:
 * - ESP32 DevKit
 * - HC-SR04 Ultrasonic Sensor (Trig: GPIO 14, Echo: GPIO 27)
 * - SIM800L GSM Module (RX: GPIO 16, TX: GPIO 17)
 * 
 * Sends data every 1 second to server
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

// WiFi Configuration
const char* ssid = "GoOneMore";
const char* password = "P@rtwor10.";

// Server Configuration
const char* serverUrl = "http://192.168.1.86:3001/api/esp32/reading";

// Node Configuration
String nodeId = "Tupi Central River";  // CHANGED for Tupi Central

// Ultrasonic Sensor Pins
const int trigPin = 14;
const int echoPin = 27;

// SIM800L Configuration
HardwareSerial sim800l(1);
const int SIM800L_RX = 16;
const int SIM800L_TX = 17;
const String phoneNumber = "+639123456789"; // Your phone number

// Alert thresholds (in meters)
const float WARNING_LEVEL = 3.5;  // 70% of 5m threshold
const float DANGER_LEVEL = 4.5;   // 90% of 5m threshold

bool alertSent = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize ultrasonic sensor
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  
  // Initialize SIM800L
  sim800l.begin(9600, SERIAL_8N1, SIM800L_RX, SIM800L_TX);
  delay(3000);
  
  Serial.println("\n=== Tupi Central River Monitoring Station ===");
  Serial.println("Initializing SIM800L...");
  sim800l.println("AT");
  delay(1000);
  sim800l.println("AT+CMGF=1"); // Set SMS to text mode
  delay(1000);
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("Starting measurements...\n");
}

void loop() {
  float waterLevel = readDistance();
  
  if (waterLevel > 0 && waterLevel < 20) {
    Serial.print("Water Level: ");
    Serial.print(waterLevel, 2);
    Serial.println(" m");
    
    // Send to server
    sendToServer(waterLevel);
    
    // Check for alerts
    checkAlerts(waterLevel);
  } else {
    Serial.println("Invalid reading");
  }
  
  delay(1000); // Send every 1 second
}

float readDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH);
  float distance = duration * 0.034 / 2 / 100; // Convert to meters
  
  return distance;
}

void sendToServer(float waterLevel) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    String jsonData = "{\"nodeId\":\"" + nodeId + "\",\"waterLevel\":" + String(waterLevel, 2) + "}";
    
    int httpResponseCode = http.POST(jsonData);
    
    if (httpResponseCode > 0) {
      Serial.print("✓ Sent to server (");
      Serial.print(httpResponseCode);
      Serial.println(")");
    } else {
      Serial.print("✗ Error: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

void checkAlerts(float waterLevel) {
  if (waterLevel >= DANGER_LEVEL && !alertSent) {
    String message = "DANGER ALERT! " + nodeId + " water level at " + String(waterLevel, 2) + "m. Flooding imminent!";
    sendSMS(message);
    alertSent = true;
    Serial.println("🚨 DANGER SMS SENT!");
  } 
  else if (waterLevel >= WARNING_LEVEL && !alertSent) {
    String message = "WARNING: " + nodeId + " water level rising. Current: " + String(waterLevel, 2) + "m. Monitor closely.";
    sendSMS(message);
    alertSent = true;
    Serial.println("⚠️ WARNING SMS SENT!");
  }
  else if (waterLevel < WARNING_LEVEL) {
    alertSent = false; // Reset when water level drops
  }
}

void sendSMS(String message) {
  sim800l.println("AT+CMGS=\"" + phoneNumber + "\"");
  delay(1000);
  sim800l.print(message);
  delay(100);
  sim800l.write(26); // Ctrl+Z to send
  delay(5000);
  
  Serial.println("SMS: " + message);
}
