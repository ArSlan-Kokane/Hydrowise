import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiClient } from "../api/client";
import type { SensorReading, WeatherSnapshot } from "../types/contracts";
import { SANGLI_RIVERS } from "../data/riverPath";

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Sangli, Maharashtra coordinates
const SANGLI_CENTER: [number, number] = [16.85, 74.58];

// Sensor locations around Sangli
const SENSOR_LOCATIONS: { id: string; name: string; position: [number, number] }[] = [
  { id: "sensor-1", name: "Sangli Central", position: [16.85, 74.58] },
  { id: "sensor-2", name: "Miraj North", position: [16.88, 74.55] },
  { id: "sensor-3", name: "Vita East", position: [16.82, 74.62] },
  { id: "sensor-4", name: "Kundal South", position: [16.78, 74.65] },
  { id: "sensor-5", name: "Jath West", position: [16.92, 74.48] },
];

interface RealTimeMapProps {
  onSensorSelect?: (sensorId: string) => void;
}

export function RealTimeMap({ onSensorSelect }: RealTimeMapProps) {
  const [sensorData, setSensorData] = useState<Map<string, SensorReading>>(new Map());
  const [weatherData, setWeatherData] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch sensor data
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const data = await apiClient.getLatestSensors();
        // For now, use the same data for all sensors (in production, each would have its own)
        SENSOR_LOCATIONS.forEach(loc => {
          setSensorData(prev => new Map(prev).set(loc.id, data));
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch sensor data:", error);
        setLoading(false);
      }
    };

    fetchSensors();

    // Poll every 30 seconds
    const interval = setInterval(fetchSensors, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const data = await apiClient.getWeather();
        setWeatherData(data);
      } catch (error) {
        console.error("Failed to fetch weather data:", error);
      }
    };

    fetchWeather();

    // Poll every 5 minutes
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, []);

  // Create custom sensor icon based on status
  const createSensorIcon = (sensorId: string) => {
    const data = sensorData.get(sensorId);
    const soilMoisture = data?.["soil_moisture_%"] || 50;
    const isHealthy = soilMoisture >= 40;
    const color = isHealthy ? "#22A366" : soilMoisture >= 30 ? "#E09228" : "#D64545";

    return L.divIcon({
      className: "custom-sensor-icon",
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
        ">
          💧
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className="realtime-map-container" style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={SANGLI_CENTER}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        className="realtime-leaflet-map"
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Real River Paths Traced Directly from OpenStreetMap Data */}
        {SANGLI_RIVERS.map((river) => {
          const isMain = river.type === "main";
          return (
            <React.Fragment key={river.id}>
              {/* 1. Subtle River Bed Outer Glow */}
              <Polyline
                positions={river.path}
                pathOptions={{
                  className: "real-river-bed",
                  color: "#38bdf8",
                  weight: isMain ? 15 : 9,
                  opacity: 0.35,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* 2. Main River Channel Body */}
              <Polyline
                positions={river.path}
                pathOptions={{
                  className: "real-river-channel",
                  color: "#0284c7",
                  weight: isMain ? 7 : 4.5,
                  opacity: 0.88,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* 3. Inner Water Core Highlight */}
              <Polyline
                positions={river.path}
                pathOptions={{
                  className: "real-river-core",
                  color: "#bae6fd",
                  weight: isMain ? 3 : 1.8,
                  opacity: 0.75,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* 4. Animated Flow Ripple Dashes (Highlighted with our river flow animation) */}
              <Polyline
                positions={river.path}
                pathOptions={{
                  className: "water-flow real-river-flow",
                  color: "#ffffff",
                  weight: isMain ? 2.2 : 1.5,
                  dashArray: isMain ? "8, 22" : "6, 18",
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              >
                <Tooltip sticky direction="top" offset={[0, -10]}>
                  <div style={{ fontFamily: "var(--font-mono, sans-serif)", fontSize: "11px", color: "#111" }}>
                    <strong>🌊 {river.name}</strong>
                    <div style={{ fontSize: "10px", color: "#0284c7" }}>
                      {isMain ? "Sangli Lifeline · Real Path Traced" : "Warna Tributary · Haripur Sangam"}
                    </div>
                  </div>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: "200px" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", color: "#0284c7" }}>
                      🌊 {river.name}
                    </h3>
                    <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#444" }}>
                      {river.description}
                    </p>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      Real-time OpenStreetMap geographic path with active current flow animation.
                    </div>
                  </div>
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* Weather radar coverage circle */}
        {weatherData && (
          <Circle
            center={SANGLI_CENTER}
            radius={weatherData["rain_probability_%"] > 30 ? 15000 : 10000}
            color={weatherData["rain_probability_%"] > 30 ? "#1976D2" : "#2E7D32"}
            fillColor={weatherData["rain_probability_%"] > 30 ? "rgba(25, 118, 210, 0.1)" : "rgba(46, 125, 50, 0.1)"}
            fillOpacity={0.3}
            weight={2}
            dashArray="5, 5"
          />
        )}

        {/* Sensor markers */}
        {SENSOR_LOCATIONS.map((loc) => {
          const data = sensorData.get(loc.id);
          return (
            <Marker
              key={loc.id}
              position={loc.position}
              icon={createSensorIcon(loc.id)}
              eventHandlers={{
                click: () => onSensorSelect?.(loc.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: "200px" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>{loc.name}</h3>
                  {data ? (
                    <>
                      <div style={{ marginBottom: "4px" }}>
                        <strong>Temperature:</strong> {data.temperature_C.toFixed(1)}°C
                      </div>
                      <div style={{ marginBottom: "4px" }}>
                        <strong>Humidity:</strong> {data["humidity_%"].toFixed(1)}%
                      </div>
                      <div style={{ marginBottom: "4px" }}>
                        <strong>Soil Moisture:</strong> {data["soil_moisture_%"].toFixed(1)}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        Last updated: {new Date(data.captured_at).toLocaleString()}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#666" }}>Loading sensor data...</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Weather station marker */}
        <Marker
          position={[16.87, 74.57]}
          icon={L.divIcon({
            className: "custom-weather-icon",
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
              ">
                🌦️
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })}
        >
          <Popup>
            <div style={{ minWidth: "200px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>Weather Station</h3>
              {weatherData ? (
                <>
                  <div style={{ marginBottom: "4px" }}>
                    <strong>Rain Probability:</strong> {weatherData["rain_probability_%"]}%
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <strong>Provider:</strong> {weatherData.provider}
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <strong>Forecast:</strong> 6-hour horizon
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    Location: Sangli, Maharashtra
                  </div>
                </>
              ) : (
                <div style={{ color: "#666" }}>Loading weather data...</div>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Map legend overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          background: "white",
          padding: "12px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          zIndex: 1000,
          fontSize: "12px",
        }}
      >
        <div style={{ marginBottom: "8px", fontWeight: "bold" }}>Legend</div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "#22A366",
              borderRadius: "50%",
              marginRight: "8px",
            }}
          />
          <span>Healthy (≥40% moisture)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "#E09228",
              borderRadius: "50%",
              marginRight: "8px",
            }}
          />
          <span>Watch (30-40% moisture)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "#D64545",
              borderRadius: "50%",
              marginRight: "8px",
            }}
          />
          <span>Stressed (&lt;30% moisture)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
          <div
            style={{
              width: "16px",
              height: "4px",
              background: "#0284c7",
              borderRadius: "2px",
              marginRight: "8px",
              boxShadow: "0 0 6px #38bdf8",
              position: "relative",
            }}
          />
          <span>Krishna River (Flow Traced)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "16px",
              height: "16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "50%",
              marginRight: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
            }}
          >
            🌦️
          </div>
          <span>Weather Station</span>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(255,255,255,0.9)",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
          }}
        >
          Loading real-time data...
        </div>
      )}
    </div>
  );
}
