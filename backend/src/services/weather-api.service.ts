import { db } from "../db";
import { weatherForecasts } from "../db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import axios from "axios";

// ==========================================
// Types & Interfaces
// ==========================================

export interface WeatherForecast {
  id: string;
  siteId: string;
  forecastTimestamp: Date;
  fetchedAt: Date;
  source: string;
  forecastType: "historical" | "current" | "forecast";

  // Solar-specific
  irradiationWhM2?: number;
  ghiWhM2?: number;
  dniWhM2?: number;
  dhiWhM2?: number;

  // Wind-specific
  windSpeedMs?: number;
  windDirectionDeg?: number;
  windGustMs?: number;

  // General weather
  temperatureC?: number;
  humidityPercent?: number;
  pressureHpa?: number;
  cloudCoverPercent?: number;
  precipitationMm?: number;
  snowMm?: number;
  visibilityM?: number;

  // Air quality
  airDensityKgM3?: number;
  aqi?: number;

  // Description
  weatherCondition?: string;
  weatherDescription?: string;

  // Raw data
  rawApiResponse?: any;
}

export interface OpenWeatherMapResponse {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: {
    all: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility: number;
  rain?: {
    "1h"?: number;
    "3h"?: number;
  };
  snow?: {
    "1h"?: number;
    "3h"?: number;
  };
}

export interface SiteLocation {
  siteId: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// ==========================================
// Weather API Service
// ==========================================

export class WeatherAPIService {
  private apiKey: string;
  private baseUrl: string = "https://api.openweathermap.org/data/2.5";
  private solcastBaseUrl: string = "https://api.solcast.com.au";

  constructor() {
    this.apiKey = process.env.OPENWEATHERMAP_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "OPENWEATHERMAP_API_KEY not set - weather API will not work",
      );
    }
  }

  // ==========================================
  // Public Methods
  // ==========================================

  /**
   * Fetch current weather for a site
   */
  async fetchCurrentWeather(
    siteLocation: SiteLocation,
  ): Promise<WeatherForecast> {
    const { latitude, longitude } = siteLocation;

    try {
      const response = await axios.get<OpenWeatherMapResponse>(
        `${this.baseUrl}/weather`,
        {
          params: {
            lat: latitude,
            lon: longitude,
            appid: this.apiKey,
            units: "metric", // Celsius, m/s
          },
        },
      );

      const weatherData = this.transformOpenWeatherMapResponse(
        response.data,
        siteLocation.siteId,
        "current",
      );

      // Save to database
      await this.saveWeatherForecast(weatherData);

      return weatherData;
    } catch (error) {
      console.error("Error fetching current weather:", error);
      throw new Error("Failed to fetch current weather");
    }
  }

  /**
   * Fetch 5-day / 3-hour forecast for a site
   */
  async fetchForecast(siteLocation: SiteLocation): Promise<WeatherForecast[]> {
    const { latitude, longitude } = siteLocation;

    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: "metric",
        },
      });

      const forecasts: WeatherForecast[] = [];

      for (const item of response.data.list) {
        const weatherData = this.transformOpenWeatherMapResponse(
          item,
          siteLocation.siteId,
          "forecast",
        );
        forecasts.push(weatherData);
      }

      // Save all forecasts to database
      await this.saveWeatherForecasts(forecasts);

      return forecasts;
    } catch (error) {
      console.error("Error fetching weather forecast:", error);
      throw new Error("Failed to fetch weather forecast");
    }
  }

  /**
   * Fetch historical weather data for a site (requires OpenWeatherMap One Call API)
   * Note: This requires a paid subscription to OpenWeatherMap
   */
  async fetchHistoricalWeather(
    _siteLocation: SiteLocation,
    _startDate: Date,
    _endDate: Date,
  ): Promise<WeatherForecast[]> {
    // Implementation depends on OpenWeatherMap Historical API
    // For now, return empty array
    console.warn(
      "Historical weather API not implemented - requires paid subscription",
    );
    return [];
  }

  /**
   * Fetch solar irradiation forecast from Solcast (solar-specific)
   * Note: Requires separate Solcast API key
   */
  async fetchSolarIrradiationForecast(
    siteLocation: SiteLocation,
  ): Promise<WeatherForecast[]> {
    const solcastApiKey = process.env.SOLCAST_API_KEY;

    if (!solcastApiKey) {
      console.warn(
        "SOLCAST_API_KEY not set - solar irradiation forecast not available",
      );
      return [];
    }

    try {
      const response = await axios.get(
        `${this.solcastBaseUrl}/world_radiation/forecasts`,
        {
          params: {
            latitude: siteLocation.latitude,
            longitude: siteLocation.longitude,
            hours: 168, // 7 days
            format: "json",
          },
          headers: {
            Authorization: `Bearer ${solcastApiKey}`,
          },
        },
      );

      const forecasts: WeatherForecast[] = response.data.forecasts.map(
        (item: any) => ({
          id: "", // Will be generated by database
          siteId: siteLocation.siteId,
          forecastTimestamp: new Date(item.period_end),
          fetchedAt: new Date(),
          source: "solcast",
          forecastType: "forecast" as const,
          ghiWhM2: item.ghi,
          dniWhM2: item.dni,
          dhiWhM2: item.dhi,
          cloudCoverPercent: item.cloud_opacity,
          rawApiResponse: item,
        }),
      );

      // Save to database
      await this.saveWeatherForecasts(forecasts);

      return forecasts;
    } catch (error) {
      console.error("Error fetching solar irradiation forecast:", error);
      throw new Error("Failed to fetch solar irradiation forecast");
    }
  }

  /**
   * Fetch enhanced wind forecast data
   * Uses NOAA API for high-resolution wind forecasts (US locations)
   * Falls back to OpenWeatherMap if NOAA is unavailable
   * Note: NOAA API is free but requires US coordinates
   */
  async fetchWindForecast(
    siteLocation: SiteLocation,
    hours: number = 24,
  ): Promise<WeatherForecast[]> {
    const noaaApiKey = process.env.NOAA_API_KEY;

    // Try NOAA API first (more accurate for wind in US)
    if (noaaApiKey) {
      try {
        return await this.fetchNOAAWindForecast(siteLocation, hours);
      } catch (error) {
        console.warn("NOAA API failed, falling back to OpenWeatherMap:", error);
      }
    }

    // Fallback to OpenWeatherMap
    console.info(
      "Using OpenWeatherMap for wind forecast (NOAA not configured or failed)",
    );
    return this.fetchForecast(siteLocation);
  }

  /**
   * Fetch wind forecast from NOAA API
   * NOAA provides high-resolution hourly wind forecasts for US locations
   */
  private async fetchNOAAWindForecast(
    siteLocation: SiteLocation,
    hours: number,
  ): Promise<WeatherForecast[]> {
    const { latitude, longitude } = siteLocation;

    try {
      // Step 1: Get grid point from lat/lon
      const pointResponse = await axios.get(
        `https://api.weather.gov/points/${latitude},${longitude}`,
        {
          headers: {
            "User-Agent": "dCMMS/1.0 (contact@dcmms.io)",
            Accept: "application/geo+json",
          },
        },
      );

      const forecastHourlyUrl = pointResponse.data.properties.forecastHourly;

      // Step 2: Get hourly forecast
      const forecastResponse = await axios.get(forecastHourlyUrl, {
        headers: {
          "User-Agent": "dCMMS/1.0 (contact@dcmms.io)",
          Accept: "application/geo+json",
        },
      });

      const periods = forecastResponse.data.properties.periods.slice(0, hours);
      const forecasts: WeatherForecast[] = [];

      for (const period of periods) {
        // Parse wind direction from text (e.g., "NW" -> degrees)
        const windDirectionDeg = this.parseWindDirection(period.windDirection);

        // Parse wind speed (e.g., "10 to 15 mph" -> average in m/s)
        const windSpeedMph = this.parseWindSpeed(period.windSpeed);
        const windSpeedMs = windSpeedMph * 0.44704; // mph to m/s

        // Estimate wind gust (typically 1.3x average for planning)
        const windGustMs = windSpeedMs * 1.3;

        // Calculate air density from temperature and standard pressure
        const temperatureC = ((period.temperature - 32) * 5) / 9; // F to C
        const pressureHpa = 1013.25; // Standard pressure (NOAA doesn't provide)
        const airDensityKgM3 = this.calculateAirDensity(
          temperatureC,
          pressureHpa,
        );

        const weatherData: WeatherForecast = {
          id: "", // Will be generated by database
          siteId: siteLocation.siteId,
          forecastTimestamp: new Date(period.startTime),
          fetchedAt: new Date(),
          source: "noaa",
          forecastType: "forecast" as const,

          // Wind-specific data
          windSpeedMs,
          windDirectionDeg,
          windGustMs,

          // General weather
          temperatureC,
          humidityPercent: period.relativeHumidity?.value || undefined,
          pressureHpa,
          cloudCoverPercent: this.parseCloudCover(period.shortForecast),

          // Air quality
          airDensityKgM3,

          // Description
          weatherCondition: period.shortForecast,
          weatherDescription: period.detailedForecast,

          // Raw data
          rawApiResponse: period,
        };

        forecasts.push(weatherData);
      }

      // Save to database
      await this.saveWeatherForecasts(forecasts);

      return forecasts;
    } catch (error) {
      console.error("Error fetching NOAA wind forecast:", error);
      throw new Error("Failed to fetch NOAA wind forecast");
    }
  }

  /**
   * Parse wind direction from compass bearing to degrees
   */
  private parseWindDirection(direction: string): number {
    const directions: { [key: string]: number } = {
      N: 0,
      NNE: 22,
      NE: 45,
      ENE: 67,
      E: 90,
      ESE: 112,
      SE: 135,
      SSE: 157,
      S: 180,
      SSW: 202,
      SW: 225,
      WSW: 247,
      W: 270,
      WNW: 292,
      NW: 315,
      NNW: 337,
    };

    return directions[direction.toUpperCase()] || 0;
  }

  /**
   * Parse wind speed from text like "10 to 15 mph" or "10 mph"
   */
  private parseWindSpeed(speedText: string): number {
    // Match patterns like "10 to 15 mph" or "10 mph"
    const match = speedText.match(/(\d+)\s*(?:to\s*(\d+))?\s*mph/i);

    if (match) {
      const low = parseInt(match[1], 10);
      const high = match[2] ? parseInt(match[2], 10) : low;
      return (low + high) / 2; // Return average
    }

    return 0;
  }

  /**
   * Estimate cloud cover percentage from weather description
   */
  private parseCloudCover(description: string): number {
    const text = description.toLowerCase();

    if (text.includes("clear") || text.includes("sunny")) return 10;
    if (text.includes("mostly clear") || text.includes("mostly sunny"))
      return 25;
    if (text.includes("partly cloudy") || text.includes("partly sunny"))
      return 50;
    if (text.includes("mostly cloudy")) return 75;
    if (text.includes("cloudy") || text.includes("overcast")) return 90;

    return 50; // Default
  }

  /**
   * Calculate air density from temperature and pressure
   * ρ = P / (R * T)
   */
  private calculateAirDensity(
    temperatureC: number,
    pressureHpa: number,
  ): number {
    const pressurePa = pressureHpa * 100; // hPa to Pa
    const temperatureK = temperatureC + 273.15; // C to K
    const gasConstant = 287.05; // J/(kg·K) for dry air

    return pressurePa / (gasConstant * temperatureK);
  }

  /**
   * Get stored weather forecasts for a site
   */
  async getWeatherForecasts(
    siteId: string,
    startDate: Date,
    endDate: Date,
    forecastType?: "historical" | "current" | "forecast",
  ): Promise<WeatherForecast[]> {
    try {
      const conditions = [
        eq(weatherForecasts.siteId, siteId),
        gte(weatherForecasts.forecastTimestamp, startDate),
        lte(weatherForecasts.forecastTimestamp, endDate),
      ];

      if (forecastType) {
        conditions.push(eq(weatherForecasts.forecastType, forecastType));
      }

      const results = await db
        .select()
        .from(weatherForecasts)
        .where(and(...conditions))
        .orderBy(desc(weatherForecasts.forecastTimestamp));

      return results.map((r) => ({
        ...r,
        irradiationWhM2: r.irradiationWhM2
          ? Number(r.irradiationWhM2)
          : undefined,
        ghiWhM2: r.ghiWhM2 ? Number(r.ghiWhM2) : undefined,
        dniWhM2: r.dniWhM2 ? Number(r.dniWhM2) : undefined,
        dhiWhM2: r.dhiWhM2 ? Number(r.dhiWhM2) : undefined,
        windSpeedMs: r.windSpeedMs ? Number(r.windSpeedMs) : undefined,
        windGustMs: r.windGustMs ? Number(r.windGustMs) : undefined,
        temperatureC: r.temperatureC ? Number(r.temperatureC) : undefined,
        pressureHpa: r.pressureHpa ? Number(r.pressureHpa) : undefined,
        precipitationMm: r.precipitationMm
          ? Number(r.precipitationMm)
          : undefined,
        snowMm: r.snowMm ? Number(r.snowMm) : undefined,
        airDensityKgM3: r.airDensityKgM3 ? Number(r.airDensityKgM3) : undefined,
      })) as WeatherForecast[];
    } catch (error) {
      console.error("Error getting weather forecasts:", error);
      throw new Error("Failed to get weather forecasts");
    }
  }

  /**
   * Get latest weather forecast for a site
   */
  async getLatestWeatherForecast(
    siteId: string,
  ): Promise<WeatherForecast | null> {
    try {
      const results = await db
        .select()
        .from(weatherForecasts)
        .where(eq(weatherForecasts.siteId, siteId))
        .orderBy(desc(weatherForecasts.fetchedAt))
        .limit(1);

      if (results.length === 0) return null;

      const r = results[0];
      return {
        ...r,
        irradiationWhM2: r.irradiationWhM2
          ? Number(r.irradiationWhM2)
          : undefined,
        ghiWhM2: r.ghiWhM2 ? Number(r.ghiWhM2) : undefined,
        dniWhM2: r.dniWhM2 ? Number(r.dniWhM2) : undefined,
        dhiWhM2: r.dhiWhM2 ? Number(r.dhiWhM2) : undefined,
        windSpeedMs: r.windSpeedMs ? Number(r.windSpeedMs) : undefined,
        windGustMs: r.windGustMs ? Number(r.windGustMs) : undefined,
        temperatureC: r.temperatureC ? Number(r.temperatureC) : undefined,
        pressureHpa: r.pressureHpa ? Number(r.pressureHpa) : undefined,
        precipitationMm: r.precipitationMm
          ? Number(r.precipitationMm)
          : undefined,
        snowMm: r.snowMm ? Number(r.snowMm) : undefined,
        airDensityKgM3: r.airDensityKgM3 ? Number(r.airDensityKgM3) : undefined,
      } as WeatherForecast;
    } catch (error) {
      console.error("Error getting latest weather forecast:", error);
      throw new Error("Failed to get latest weather forecast");
    }
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Transform OpenWeatherMap API response to our internal format
   */
  private transformOpenWeatherMapResponse(
    data: OpenWeatherMapResponse,
    siteId: string,
    forecastType: "historical" | "current" | "forecast",
  ): WeatherForecast {
    // Calculate air density (ρ = P / (R * T))
    // P = pressure in Pa, R = 287.05 J/(kg·K), T = temperature in Kelvin
    const pressurePa = data.main.pressure * 100; // Convert hPa to Pa
    const temperatureK = data.main.temp + 273.15; // Convert Celsius to Kelvin
    const airDensityKgM3 = pressurePa / (287.05 * temperatureK);

    return {
      id: "", // Will be generated by database
      siteId,
      forecastTimestamp: new Date(data.dt * 1000),
      fetchedAt: new Date(),
      source: "openweathermap",
      forecastType,

      // Wind data
      windSpeedMs: data.wind.speed,
      windDirectionDeg: data.wind.deg,
      windGustMs: data.wind.gust,

      // General weather
      temperatureC: data.main.temp,
      humidityPercent: data.main.humidity,
      pressureHpa: data.main.pressure,
      cloudCoverPercent: data.clouds.all,
      precipitationMm: data.rain?.["1h"] || data.rain?.["3h"] || 0,
      snowMm: data.snow?.["1h"] || data.snow?.["3h"] || 0,
      visibilityM: data.visibility,

      // Air quality
      airDensityKgM3,

      // Description
      weatherCondition: data.weather[0]?.main,
      weatherDescription: data.weather[0]?.description,

      // Raw data for debugging
      rawApiResponse: data,
    };
  }

  /**
   * Save a single weather forecast to database
   */
  private async saveWeatherForecast(
    weatherData: WeatherForecast,
  ): Promise<void> {
    try {
      await db
        .insert(weatherForecasts)
        .values({
          siteId: weatherData.siteId,
          forecastTimestamp: weatherData.forecastTimestamp,
          fetchedAt: weatherData.fetchedAt,
          source: weatherData.source,
          forecastType: weatherData.forecastType,

          irradiationWhM2: weatherData.irradiationWhM2?.toString(),
          ghiWhM2: weatherData.ghiWhM2?.toString(),
          dniWhM2: weatherData.dniWhM2?.toString(),
          dhiWhM2: weatherData.dhiWhM2?.toString(),

          windSpeedMs: weatherData.windSpeedMs?.toString(),
          windDirectionDeg: weatherData.windDirectionDeg, // integer
          windGustMs: weatherData.windGustMs?.toString(),

          temperatureC: weatherData.temperatureC?.toString(),
          humidityPercent: weatherData.humidityPercent, // integer
          pressureHpa: weatherData.pressureHpa?.toString(),
          cloudCoverPercent: weatherData.cloudCoverPercent, // integer
          precipitationMm: weatherData.precipitationMm?.toString(),
          snowMm: weatherData.snowMm?.toString(),
          visibilityM: weatherData.visibilityM, // integer

          airDensityKgM3: weatherData.airDensityKgM3?.toString(),
          aqi: weatherData.aqi, // integer

          weatherCondition: weatherData.weatherCondition,
          weatherDescription: weatherData.weatherDescription,

          rawApiResponse: weatherData.rawApiResponse,
        })
        .onConflictDoUpdate({
          target: [
            weatherForecasts.siteId,
            weatherForecasts.forecastTimestamp,
            weatherForecasts.source,
          ],
          set: {
            fetchedAt: weatherData.fetchedAt,
            windSpeedMs: weatherData.windSpeedMs?.toString(),
            windDirectionDeg: weatherData.windDirectionDeg,
            temperatureC: weatherData.temperatureC?.toString(),
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error("Error saving weather forecast:", error);
      throw error;
    }
  }

  /**
   * Save multiple weather forecasts to database
   */
  private async saveWeatherForecasts(
    forecasts: WeatherForecast[],
  ): Promise<void> {
    for (const forecast of forecasts) {
      await this.saveWeatherForecast(forecast);
    }
  }
}

// Export singleton instance
export const weatherAPIService = new WeatherAPIService();
