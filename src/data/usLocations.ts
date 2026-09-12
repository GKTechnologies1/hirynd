// US Locations Catalog for Country, State, and City suggestions

export const RECOMMENDED_COUNTRIES = ["United States"];

export interface USStateInfo {
  name: string;
  code: string;
  cities: string[];
}

export const US_STATES: USStateInfo[] = [
  { name: "Alabama", code: "AL", cities: ["Birmingham", "Huntsville", "Montgomery", "Mobile", "Tuscaloosa", "Auburn", "Hoover"] },
  { name: "Alaska", code: "AK", cities: ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan"] },
  { name: "Arizona", code: "AZ", cities: ["Phoenix", "Scottsdale", "Tempe", "Mesa", "Chandler", "Tucson", "Glendale", "Gilbert", "Peoria"] },
  { name: "Arkansas", code: "AR", cities: ["Little Rock", "Fayetteville", "Bentonville", "Springdale", "Fort Smith", "Rogers"] },
  {
    name: "California",
    code: "CA",
    cities: [
      "San Francisco", "San Jose", "Los Angeles", "San Diego", "Sacramento", "Oakland",
      "Irvine", "Palo Alto", "Mountain View", "Sunnyvale", "Santa Clara", "Fremont",
      "Pasadena", "Anaheim", "Long Beach", "Fresno", "Berkeley", "Cupertino", "Menlo Park", "San Mateo"
    ]
  },
  { name: "Colorado", code: "CO", cities: ["Denver", "Boulder", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton"] },
  { name: "Connecticut", code: "CT", cities: ["Stamford", "Hartford", "New Haven", "Bridgeport", "Greenwich", "Norwalk", "Danbury"] },
  { name: "Delaware", code: "DE", cities: ["Wilmington", "Dover", "Newark", "Middletown"] },
  { name: "District of Columbia", code: "DC", cities: ["Washington"] },
  {
    name: "Florida",
    code: "FL",
    cities: [
      "Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale", "St. Petersburg",
      "Tallahassee", "West Palm Beach", "Boca Raton", "Gainesville", "Sarasota", "Clearwater"
    ]
  },
  { name: "Georgia", code: "GA", cities: ["Atlanta", "Alpharetta", "Marietta", "Savannah", "Augusta", "Sandy Springs", "Athens", "Roswell"] },
  { name: "Hawaii", code: "HI", cities: ["Honolulu", "Hilo", "Pearl City", "Kailua"] },
  { name: "Idaho", code: "ID", cities: ["Boise", "Meridian", "Nampa", "Idaho Falls", "Caldwell"] },
  { name: "Illinois", code: "IL", cities: ["Chicago", "Naperville", "Evanston", "Peoria", "Rockford", "Schaumburg", "Champaign", "Springfield"] },
  { name: "Indiana", code: "IN", cities: ["Indianapolis", "Fort Wayne", "Bloomington", "South Bend", "Carmel", "Fishers"] },
  { name: "Iowa", code: "IA", cities: ["Des Moines", "Cedar Rapids", "Iowa City", "Davenport", "Ames"] },
  { name: "Kansas", code: "KS", cities: ["Overland Park", "Kansas City", "Wichita", "Topeka", "Olathe", "Lawrence"] },
  { name: "Kentucky", code: "KY", cities: ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington"] },
  { name: "Louisiana", code: "LA", cities: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Metairie"] },
  { name: "Maine", code: "ME", cities: ["Portland", "Bangor", "Lewiston", "South Portland"] },
  { name: "Maryland", code: "MD", cities: ["Baltimore", "Bethesda", "Silver Spring", "Rockville", "Frederick", "Columbia", "Gaithersburg"] },
  { name: "Massachusetts", code: "MA", cities: ["Boston", "Cambridge", "Waltham", "Worcester", "Somerville", "Quincy", "Newton", "Lowell", "Burlington"] },
  { name: "Michigan", code: "MI", cities: ["Detroit", "Ann Arbor", "Grand Rapids", "Lansing", "Troy", "Dearborn", "Kalamazoo"] },
  { name: "Minnesota", code: "MN", cities: ["Minneapolis", "Saint Paul", "Bloomington", "Rochester", "Duluth", "Plymouth"] },
  { name: "Mississippi", code: "MS", cities: ["Jackson", "Gulfport", "Southaven", "Biloxi", "Hattiesburg"] },
  { name: "Missouri", code: "MO", cities: ["St. Louis", "Kansas City", "Springfield", "Columbia", "Independence"] },
  { name: "Montana", code: "MT", cities: ["Billings", "Missoula", "Bozeman", "Helena"] },
  { name: "Nebraska", code: "NE", cities: ["Omaha", "Lincoln", "Bellevue", "Grand Island"] },
  { name: "Nevada", code: "NV", cities: ["Las Vegas", "Reno", "Henderson", "North Las Vegas", "Carson City"] },
  { name: "New Hampshire", code: "NH", cities: ["Manchester", "Nashua", "Concord", "Portsmouth"] },
  { name: "New Jersey", code: "NJ", cities: ["Jersey City", "Newark", "Princeton", "Hoboken", "Edison", "Trenton", "Morristown"] },
  { name: "New Mexico", code: "NM", cities: ["Albuquerque", "Santa Fe", "Las Cruces", "Rio Rancho"] },
  {
    name: "New York",
    code: "NY",
    cities: [
      "New York", "Brooklyn", "Manhattan", "Queens", "Bronx", "Buffalo",
      "Rochester", "Albany", "Syracuse", "White Plains", "Yonkers"
    ]
  },
  { name: "North Carolina", code: "NC", cities: ["Charlotte", "Raleigh", "Durham", "Cary", "Greensboro", "Winston-Salem", "Chapel Hill", "Wilmington"] },
  { name: "North Dakota", code: "ND", cities: ["Fargo", "Bismarck", "Grand Forks", "Minot"] },
  { name: "Ohio", code: "OH", cities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Dublin"] },
  { name: "Oklahoma", code: "OK", cities: ["Oklahoma City", "Tulsa", "Norman", "Edmond"] },
  { name: "Oregon", code: "OR", cities: ["Portland", "Beaverton", "Hillsboro", "Eugene", "Bend", "Salem"] },
  { name: "Pennsylvania", code: "PA", cities: ["Philadelphia", "Pittsburgh", "Allentown", "Harrisburg", "Erie", "Reading", "Scranton"] },
  { name: "Rhode Island", code: "RI", cities: ["Providence", "Newport", "Warwick", "Cranston"] },
  { name: "South Carolina", code: "SC", cities: ["Charleston", "Columbia", "Greenville", "Mount Pleasant", "Rock Hill"] },
  { name: "South Dakota", code: "SD", cities: ["Sioux Falls", "Rapid City", "Aberdeen"] },
  { name: "Tennessee", code: "TN", cities: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Franklin", "Clarksville"] },
  {
    name: "Texas",
    code: "TX",
    cities: [
      "Austin", "Dallas", "Houston", "San Antonio", "Fort Worth", "Plano",
      "Irving", "Frisco", "El Paso", "Arlington", "Richardson", "The Woodlands"
    ]
  },
  { name: "Utah", code: "UT", cities: ["Salt Lake City", "Provo", "Lehi", "Sandy", "Ogden", "Orem"] },
  { name: "Vermont", code: "VT", cities: ["Burlington", "Montpelier", "Rutland"] },
  { name: "Virginia", code: "VA", cities: ["Arlington", "Alexandria", "Richmond", "Tysons", "Reston", "Virginia Beach", "Norfolk", "McLean", "Fairfax"] },
  { name: "Washington", code: "WA", cities: ["Seattle", "Bellevue", "Redmond", "Kirkland", "Tacoma", "Spokane", "Vancouver"] },
  { name: "West Virginia", code: "WV", cities: ["Charleston", "Morgantown", "Huntington"] },
  { name: "Wisconsin", code: "WI", cities: ["Milwaukee", "Madison", "Green Bay", "Kenosha"] },
  { name: "Wyoming", code: "WY", cities: ["Cheyenne", "Casper", "Laramie"] }
];

export const TOP_US_CITIES = [
  "New York", "San Francisco", "Austin", "Seattle", "Chicago", "Los Angeles",
  "Boston", "Atlanta", "Dallas", "Denver", "San Jose", "San Diego", "Houston",
  "Miami", "Washington", "Phoenix", "Philadelphia", "Portland", "Raleigh",
  "Charlotte", "Minneapolis", "Detroit", "Salt Lake City", "Tampa", "Nashville",
  "Pittsburgh", "Indianapolis", "Columbus", "St. Louis", "Baltimore", "Orlando"
];

// Helper to get state options (e.g. "California", "CA", "Texas", "TX")
export const US_STATE_OPTIONS = US_STATES.flatMap(s => [s.name, s.code]);

// Get recommended cities for a given state input
export function getCitiesForState(stateInput?: string): string[] {
  if (!stateInput || !stateInput.trim()) {
    return TOP_US_CITIES;
  }
  const clean = stateInput.trim().toLowerCase();
  const found = US_STATES.find(
    s => s.name.toLowerCase() === clean || s.code.toLowerCase() === clean
  );
  if (found) {
    return found.cities;
  }
  return TOP_US_CITIES;
}

// Find state info if city matches a known US city
export function findStateForCity(cityName?: string): { name: string; code: string } | null {
  if (!cityName || !cityName.trim()) return null;
  const clean = cityName.trim().toLowerCase();
  for (const s of US_STATES) {
    if (s.cities.some(c => c.toLowerCase() === clean)) {
      return { name: s.name, code: s.code };
    }
  }
  return null;
}

/**
 * Formats a salary input strictly as an amount:
 * - Completely strips all alphabetic and invalid characters
 * - Formats digits with commas (e.g. 100000 -> $100,000)
 * - Allows optional decimal point (e.g. $50.00)
 * - Prepends dollar sign '$'
 */
export function formatSalaryAmount(val: string): string {
  if (!val) return "";
  // Strip everything that is NOT a digit or dot (NO alphabets allowed)
  const clean = val.replace(/[^0-9.]/g, "");
  if (!clean) return "";

  // Split integer and decimal parts
  const parts = clean.split(".");
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? `.${parts[1].slice(0, 2)}` : "";

  // Add thousand commas
  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `$${formattedInt}${decimalPart}`;
}

// Alias for backwards compatibility
export const formatSalaryInput = formatSalaryAmount;

// KeyDown blocker to prevent typing any alphabetic characters or symbols into salary fields
export function handleSalaryKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  // Allow navigation and editing keys
  if (
    [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Enter",
      "Escape",
      "Home",
      "End",
    ].includes(e.key)
  ) {
    return;
  }
  // Allow copy/paste/select-all shortcuts
  if (e.ctrlKey || e.metaKey) {
    return;
  }
  // Block any key that is not a digit, dollar sign, or dot (strictly NO alphabets)
  if (!/[\d.$]/.test(e.key)) {
    e.preventDefault();
  }
}
