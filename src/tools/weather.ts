// Generated on 2025-06-03
/**
 * Weather information tool
 * Fetches current weather for a given location using Open-Meteo API
 * @see https://open-meteo.com/en/docs
 */
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";

/**
 * Schema for weather queries
 */
const weatherSchema = z.object({
  location: z.string().describe("City name or location for weather lookup")
});

/**
 * @typedef {Object} WeatherInput
 * @property {string} location - City or location name
 */
type WeatherInput = z.infer<typeof weatherSchema>;

/**
 * Weather tool implementation
 * @param {WeatherInput} params
 * @returns {Promise<object>} Weather data for the location
 * @throws {Error} If fetch fails or location is invalid
 */
export const weatherTool = createTool({
  name: "weather",
  description: "Fetches current weather for a given location (city name, etc). Uses Open-Meteo public API.",
  parameters: weatherSchema,
  execute: async ({ location }: WeatherInput) => {
    try {
      logger.info("[weatherTool] Fetching weather for location", { location });
      // Use Open-Meteo geocoding to get lat/lon
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}`);
      if (!geoRes.ok) throw new Error("Failed to fetch geocoding data");
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) throw new Error("Location not found");
      const { latitude, longitude, name, country } = geoData.results[0];
      // Fetch current weather
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
      if (!weatherRes.ok) throw new Error("Failed to fetch weather data");
      const weatherData = await weatherRes.json();
      if (!weatherData.current_weather) throw new Error("Weather data unavailable");
      return {
        location: `${name}, ${country}`,
        temperature_c: weatherData.current_weather.temperature,
        wind_kph: weatherData.current_weather.windspeed,
        weather_code: weatherData.current_weather.weathercode,
        time: weatherData.current_weather.time
      };
    } catch (error) {
      logger.error("[weatherTool] Error fetching weather", { location, error: error instanceof Error ? error.message : String(error) });
      throw new Error("Weather lookup failed: " + (error instanceof Error ? error.message : String(error)));
    }
  }
});
