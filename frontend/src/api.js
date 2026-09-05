const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function checkHealth() {
  const response = await fetch(`${API_URL}/api/health/`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}
