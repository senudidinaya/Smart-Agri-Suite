const OPEN_WEATHER_API_KEY = process.env.EXPO_PUBLIC_OPEN_WEATHER_KEY;

export async function fetchWeather(
  city: string,
  fallback: {
    temp: number;
    condition: string;
    humidity: number;
  }
) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
    );

    if (!res.ok) throw new Error("Weather API failed");

    const data = await res.json();

    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      humidity: data.main.humidity,
      source: "api",
    };
  } catch (err) {
    // Fallback for PP1 safety
    return {
      ...fallback,
      source: "fallback",
    };
  }
}

export async function optimizeMarket(payload: {
  spice: string;
  quantity: number;
  province: string;
  city: string;
}) {
  try {
    const res = await fetch("http://localhost:5000/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Optimize API failed");

    return await res.json();
  } catch (err) {
    // PP1-safe fallback
    return {
      bestMarket: "Dambulla Economic Center",
      pricePerKg: 2450,
      transportCost: 450,
      netProfit: payload.quantity * 2450 - 450,
      profitPercent: 12,
      demandLevel: "High",
      distanceKm: 12.4,
      source: "fallback",
    };
  }
}
