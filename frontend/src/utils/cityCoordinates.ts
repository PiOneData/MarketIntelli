/**
 * Coordinates for Indian cities/localities that appear in the datacenter dataset.
 * Used by DataCenterMap to place individual datacenter markers by city.
 * Fallback order: lat/lng from DB → city coordinates → state coordinates.
 *
 * Coordinates are [latitude, longitude].
 */
export const CITY_COORDINATES: Record<string, [number, number]> = {
  // Andhra Pradesh
  "Guntur": [16.3067, 80.4365],
  "Mangalagiri": [16.4310, 80.5614],
  "Visakhapatnam": [17.6868, 83.2185],

  // Bihar
  "Patna": [25.5941, 85.1376],

  // Chhattisgarh
  "Raipur": [21.2514, 81.6296],

  // Delhi / NCR
  "Delhi": [28.6139, 77.2090],
  "New Delhi": [28.6139, 77.2090],
  "Greater Kailash (GK)": [28.5444, 77.2275],
  "Gurgaon": [28.4595, 77.0266],
  "Gurugram": [28.4595, 77.0266],
  "Noida": [28.5355, 77.3910],
  "Ghaziabad": [28.6692, 77.4538],
  "Faridabad": [28.4082, 77.3178],
  "Manesar": [28.3566, 76.9377],
  "Sonipat": [28.9931, 77.0151],

  // Gujarat
  "Ahmedabad": [23.0225, 72.5714],
  "Gandhinagar": [23.2156, 72.6369],
  "Gandhi nagar": [23.2156, 72.6369],

  // Haryana
  "Rohtak": [28.8955, 76.6066],
  "Panchkula": [30.7034, 76.8528],
  "Tusiana": [29.1000, 76.7000],

  // Karnataka
  "Bangalore": [12.9716, 77.5946],
  "Bengaluru": [12.9716, 77.5946],
  "Banagalore": [12.9716, 77.5946],
  "Banaswadi": [13.0281, 77.6471],
  "Bidadi": [12.7983, 77.3860],
  "Dooravani Nagar": [12.9950, 77.6633],
  "Electronic City Phase One": [12.8458, 77.6683],
  "Geddalahalli": [13.0627, 77.5900],
  "Mahadeva Kodigehalli": [13.0548, 77.5921],
  "Puram": [13.0009, 77.6932],
  "Whitefield": [12.9698, 77.7500],

  // Kerala
  "Cochin": [9.9312, 76.2673],
  "Ernakulam": [9.9816, 76.2999],
  "Kochi": [9.9312, 76.2673],
  "Alappuzha": [9.4981, 76.3388],
  "Coimbatore": [11.0168, 76.9558],  // technically Tamil Nadu but included here

  // Madhya Pradesh
  "Bhopal": [23.2599, 77.4126],
  "Indore": [22.7196, 75.8577],

  // Maharashtra
  "Mumbai": [19.0760, 72.8777],
  "Navi Mumbai": [19.0330, 73.0297],
  "Thane": [19.2183, 72.9781],
  "Pune": [18.5204, 73.8567],
  "Nashik": [19.9975, 73.7898],
  "Airoli": [19.1590, 72.9990],
  "Andheri": [19.1197, 72.8468],
  "Andheri (E)": [19.1115, 72.8698],
  "Andheri East": [19.1115, 72.8698],
  "Bandra": [19.0544, 72.8402],
  "Chandivali": [19.1021, 72.9015],
  "Dighe": [19.0984, 73.0044],
  "Hinjewadi": [18.5912, 73.7389],
  "Kothrud": [18.5074, 73.8077],
  "Mahape": [19.1290, 73.0158],
  "Palava": [19.1764, 73.0966],
  "Panvel": [18.9894, 73.1175],
  "Pimpri": [18.6298, 73.7997],
  "Pimpri-Chinchwad": [18.6298, 73.7997],
  "Powai": [19.1176, 72.9060],
  "Rabale": [19.1344, 73.0184],
  "Vikhroli (W)": [19.1042, 72.9289],
  "Vikhroli West": [19.1042, 72.9289],

  // Odisha
  "Bhubaneswar": [20.2961, 85.8245],

  // Puducherry
  "Pondicherry": [11.9416, 79.8083],
  "Puducherry": [11.9416, 79.8083],

  // Punjab / Chandigarh
  "Chandigarh": [30.7333, 76.7794],
  "Ludhiana": [30.9010, 75.8573],
  "Mohali": [30.8398, 76.8601],
  "Rajpura": [30.4919, 76.5954],

  // Rajasthan
  "Jaipur": [26.9124, 75.7873],
  "Alwar": [27.5530, 76.6346],

  // Tamil Nadu
  "Chennai": [13.0827, 80.2707],
  "Ambattur": [13.1143, 80.1548],
  "Anakaputhur": [12.9847, 80.0812],
  "Kallikuppam": [13.0100, 79.9790],
  "Kanchipuram": [12.8185, 79.6947],
  "Madurai": [9.9252, 78.1198],
  "Oragadam": [12.7882, 80.0100],
  "Siruseri": [12.8108, 80.2223],
  "Sriperumbudur": [12.9675, 79.9443],
  "Pollachi": [10.6589, 77.0077],

  // Telangana
  "Hyderabad": [17.3850, 78.4867],
  "Secunderabad": [17.4399, 78.4983],
  "Gachibowli": [17.4401, 78.3489],
  "Madhapur": [17.4477, 78.3718],
  "Patancheru": [17.5303, 78.2634],
  "Shadnagar": [17.0683, 78.2105],
  "Shahabad": [17.1114, 77.8930],
  "Shabad": [17.1114, 77.8930],
  "Elkatta": [17.1500, 78.4500],
  "Kongar Khurd B": [17.1073, 78.4571],
  "Kongar": [17.1073, 78.4571],
  "Machanpalle": [16.7500, 78.0000],
  "Mekaguda": [17.3900, 78.5200],
  "Telengana": [17.3850, 78.4867],
  "Vailkunta Tanda": [17.1073, 78.4571],
  "Tanda": [17.1073, 78.4571],
  "Chandenvelly": [17.3616, 78.5504],

  // Tripura
  "Agartala": [23.8315, 91.2868],

  // Uttar Pradesh
  "Lucknow": [26.8467, 80.9462],

  // West Bengal
  "Kolkata": [22.5726, 88.3639],
};

/**
 * Resolve [lat, lng] for a datacenter given its city and state.
 * Falls back from city → state coordinates.
 */
export function resolveCoordinates(
  city: string,
  state: string,
  stateCoords: Record<string, [number, number]>
): [number, number] | null {
  // Try exact city match
  if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];

  // Try case-insensitive match
  const cityLower = city.toLowerCase();
  for (const [key, val] of Object.entries(CITY_COORDINATES)) {
    if (key.toLowerCase() === cityLower) return val;
  }

  // Fall back to state
  if (stateCoords[state]) return stateCoords[state];

  return null;
}
