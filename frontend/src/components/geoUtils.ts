// Simple geocoding for demo purposes. In production, use a geocoding API.
export const cityStateToLatLng: Record<string, { lat: number; lng: number }> = {
  "Mumbai,Maharashtra": { lat: 19.076, lng: 72.8777 },
  "Hyderabad,Telangana": { lat: 17.385, lng: 78.4867 },
  "Chennai,Tamil Nadu": { lat: 13.0827, lng: 80.2707 },
  "Bangalore,Karnataka": { lat: 12.9716, lng: 77.5946 },
  "Pune,Maharashtra": { lat: 18.5204, lng: 73.8567 },
  "Greater Noida,Uttar Pradesh": { lat: 28.4744, lng: 77.504 },
};

export function getLatLng(city: string, state: string) {
  return cityStateToLatLng[`${city},${state}`] || { lat: 22.5937, lng: 78.9629 };
}
