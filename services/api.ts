const API_BASE = "http://localhost:5000"; // backend running locally

export async function getBestMarket(spice: string, region: string) {
  const res = await fetch(`${API_BASE}/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spice, region }),
  });
  return res.json();
}

export async function getRoute(from: string, to: string, vehicle: string) {
  const res = await fetch(`${API_BASE}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, vehicle }),
  });
  return res.json();
}

export async function getAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  return res.json();
}
