import re
from django.db.models import Q

# All 50 US States + District of Columbia mapped to their official 2-letter postal code and major cities
US_CITIES_BY_STATE = {
    'Alabama': ('AL', ['Birmingham', 'Huntsville', 'Montgomery', 'Mobile', 'Tuscaloosa', 'Auburn', 'Hoover', 'Dothan']),
    'Alaska': ('AK', ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan']),
    'Arizona': ('AZ', ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Tucson', 'Glendale', 'Gilbert', 'Peoria', 'Surprise']),
    'Arkansas': ('AR', ['Little Rock', 'Fayetteville', 'Bentonville', 'Springdale', 'Fort Smith', 'Rogers', 'Jonesboro']),
    'California': ('CA', [
        'San Francisco', 'San Jose', 'Los Angeles', 'San Diego', 'Sacramento', 'Oakland',
        'Irvine', 'Palo Alto', 'Mountain View', 'Sunnyvale', 'Santa Clara', 'Fremont',
        'Pasadena', 'Anaheim', 'Long Beach', 'Fresno', 'Berkeley', 'Burbank', 'Redwood City',
        'San Mateo', 'Santa Monica', 'Cupertino', 'Menlo Park'
    ]),
    'Colorado': ('CO', ['Denver', 'Boulder', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Centennial']),
    'Connecticut': ('CT', ['Stamford', 'Hartford', 'New Haven', 'Bridgeport', 'Greenwich', 'Norwalk', 'Danbury', 'Waterbury']),
    'Delaware': ('DE', ['Wilmington', 'Dover', 'Newark', 'Middletown']),
    'District of Columbia': ('DC', ['Washington']),
    'Florida': ('FL', [
        'Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg',
        'Tallahassee', 'West Palm Beach', 'Boca Raton', 'Gainesville', 'Sarasota', 'Clearwater', 'Coral Gables'
    ]),
    'Georgia': ('GA', ['Atlanta', 'Alpharetta', 'Marietta', 'Savannah', 'Augusta', 'Sandy Springs', 'Athens', 'Roswell', 'Johns Creek', 'Duluth']),
    'Hawaii': ('HI', ['Honolulu', 'Hilo', 'Pearl City', 'Kailua']),
    'Idaho': ('ID', ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Caldwell', 'Coeur d\'Alene']),
    'Illinois': ('IL', ['Chicago', 'Naperville', 'Evanston', 'Peoria', 'Rockford', 'Schaumburg', 'Champaign', 'Springfield', 'Arlington Heights']),
    'Indiana': ('IN', ['Indianapolis', 'Fort Wayne', 'Bloomington', 'South Bend', 'Carmel', 'Fishers', 'Evansville']),
    'Iowa': ('IA', ['Des Moines', 'Cedar Rapids', 'Iowa City', 'Davenport', 'Ames', 'Sioux City']),
    'Kansas': ('KS', ['Overland Park', 'Kansas City', 'Wichita', 'Topeka', 'Olathe', 'Lawrence']),
    'Kentucky': ('KY', ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington']),
    'Louisiana': ('LA', ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Metairie']),
    'Maine': ('ME', ['Portland', 'Bangor', 'Lewiston', 'South Portland']),
    'Maryland': ('MD', ['Baltimore', 'Bethesda', 'Silver Spring', 'Rockville', 'Frederick', 'Columbia', 'Gaithersburg', 'Annapolis']),
    'Massachusetts': ('MA', ['Boston', 'Cambridge', 'Waltham', 'Worcester', 'Somerville', 'Quincy', 'Newton', 'Lowell', 'Burlington', 'Framingham']),
    'Michigan': ('MI', ['Detroit', 'Ann Arbor', 'Grand Rapids', 'Lansing', 'Troy', 'Dearborn', 'Kalamazoo', 'Warren', 'Southfield']),
    'Minnesota': ('MN', ['Minneapolis', 'Saint Paul', 'Bloomington', 'Rochester', 'Duluth', 'Plymouth', 'Maple Grove', 'Minnetonka']),
    'Mississippi': ('MS', ['Jackson', 'Gulfport', 'Southaven', 'Biloxi', 'Hattiesburg']),
    'Missouri': ('MO', ['St. Louis', 'Kansas City', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit']),
    'Montana': ('MT', ['Billings', 'Missoula', 'Bozeman', 'Helena', 'Great Falls']),
    'Nebraska': ('NE', ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island']),
    'Nevada': ('NV', ['Las Vegas', 'Reno', 'Henderson', 'North Las Vegas', 'Carson City', 'Sparks']),
    'New Hampshire': ('NH', ['Manchester', 'Nashua', 'Concord', 'Portsmouth', 'Dover']),
    'New Jersey': ('NJ', ['Jersey City', 'Newark', 'Princeton', 'Hoboken', 'Edison', 'Trenton', 'Morristown', 'New Brunswick', 'Cherry Hill', 'Parsippany']),
    'New Mexico': ('NM', ['Albuquerque', 'Santa Fe', 'Las Cruces', 'Rio Rancho']),
    'New York': ('NY', [
        'New York', 'Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Buffalo', 'Rochester',
        'Albany', 'Syracuse', 'White Plains', 'Yonkers', 'Ithaca'
    ]),
    'North Carolina': ('NC', ['Charlotte', 'Raleigh', 'Durham', 'Cary', 'Greensboro', 'Winston-Salem', 'Chapel Hill', 'Wilmington', 'Asheville']),
    'North Dakota': ('ND', ['Fargo', 'Bismarck', 'Grand Forks', 'Minot']),
    'Ohio': ('OH', ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Dublin', 'Canton']),
    'Oklahoma': ('OK', ['Oklahoma City', 'Tulsa', 'Norman', 'Edmond', 'Broken Arrow']),
    'Oregon': ('OR', ['Portland', 'Beaverton', 'Hillsboro', 'Eugene', 'Bend', 'Salem', 'Gresham']),
    'Pennsylvania': ('PA', ['Philadelphia', 'Pittsburgh', 'Allentown', 'Harrisburg', 'Erie', 'Reading', 'Bethlehem', 'Scranton', 'King of Prussia']),
    'Rhode Island': ('RI', ['Providence', 'Newport', 'Warwick', 'Cranston', 'Pawtucket']),
    'South Carolina': ('SC', ['Charleston', 'Columbia', 'Greenville', 'Mount Pleasant', 'Rock Hill', 'Myrtle Beach']),
    'South Dakota': ('SD', ['Sioux Falls', 'Rapid City', 'Aberdeen']),
    'Tennessee': ('TN', ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Franklin', 'Clarksville', 'Murfreesboro']),
    'Texas': ('TX', [
        'Austin', 'Dallas', 'Houston', 'San Antonio', 'Fort Worth', 'Plano', 'Irving',
        'El Paso', 'Frisco', 'Arlington', 'Richardson', 'The Woodlands', 'Lubbock', 'Garland', 'McKinney'
    ]),
    'Utah': ('UT', ['Salt Lake City', 'Provo', 'Lehi', 'Sandy', 'Ogden', 'Orem', 'Draper', 'South Jordan']),
    'Vermont': ('VT', ['Burlington', 'Montpelier', 'Rutland', 'South Burlington']),
    'Virginia': ('VA', [
        'Arlington', 'Alexandria', 'Richmond', 'Tysons', 'Reston', 'Virginia Beach',
        'Norfolk', 'McLean', 'Fairfax', 'Charlottesville', 'Roanoke', 'Herndon'
    ]),
    'Washington': ('WA', ['Seattle', 'Bellevue', 'Redmond', 'Kirkland', 'Tacoma', 'Spokane', 'Vancouver', 'Renton', 'Everett', 'Olympia']),
    'West Virginia': ('WV', ['Charleston', 'Morgantown', 'Huntington', 'Parkersburg']),
    'Wisconsin': ('WI', ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha']),
    'Wyoming': ('WY', ['Cheyenne', 'Casper', 'Laramie', 'Gillette'])
}

# Lookup maps
US_STATE_NAME_TO_CODE = {state.lower(): code for state, (code, _) in US_CITIES_BY_STATE.items()}
US_CODE_TO_STATE_NAME = {code: state for state, (code, _) in US_CITIES_BY_STATE.items()}
US_STATE_CODES = set(US_CODE_TO_STATE_NAME.keys())


def get_us_locations_data(extra_db_records=None):
    """
    Builds the structured locations dictionary where 'United States' is the ONLY country,
    and cities contains all US states and major cities (+ any active DB locations in the US).
    """
    states_dict = {}
    cities_and_states_set = set()

    # 1. Populate states and standard cities catalog
    for state, (code, cities) in US_CITIES_BY_STATE.items():
        states_dict[state] = sorted(cities)
        # Add the state itself formatted with its postal code
        cities_and_states_set.add(f"{state} ({code})")
        # Add each city formatted with state postal code
        for c in cities:
            cities_and_states_set.add(f"{c}, {code}")

    cities_and_states_set.add("Remote")

    # 2. Ingest any extra US locations from active DB records
    if extra_db_records:
        for entry in extra_db_records:
            c = (entry.get('country') or '').strip()
            s = (entry.get('state') or '').strip()
            ci = (entry.get('city') or '').strip()

            # Ignore explicitly non-US countries
            c_lower = c.lower()
            if c_lower in ('india', 'canada', 'united kingdom', 'uk', 'germany', 'australia'):
                continue
            if not c and any(x in (s + ci).lower() for x in ('india', 'canada', 'uk', 'kingdom')):
                continue

            # If state matches a known US state, normalize
            st_name = None
            st_code = None
            if s:
                if s.lower() in US_STATE_NAME_TO_CODE:
                    st_name = s.title()
                    st_code = US_STATE_NAME_TO_CODE[s.lower()]
                elif s.upper() in US_CODE_TO_STATE_NAME:
                    st_code = s.upper()
                    st_name = US_CODE_TO_STATE_NAME[st_code]

            if ci and st_code:
                cities_and_states_set.add(f"{ci}, {st_code}")
                if st_name and st_name in states_dict and ci not in states_dict[st_name]:
                    states_dict[st_name].append(ci)
            elif ci and s:
                cities_and_states_set.add(f"{ci}, {s}")
            elif ci:
                cities_and_states_set.add(ci)
            elif s:
                if st_name and st_code:
                    cities_and_states_set.add(f"{st_name} ({st_code})")
                else:
                    cities_and_states_set.add(s)

    # Sort each state's city list
    formatted_states = {k: sorted(list(set(v))) for k, v in sorted(states_dict.items())}
    sorted_cities = sorted(list(cities_and_states_set))

    return {
        "countries": {
            "United States": {
                "states": formatted_states,
                "cities": sorted_cities
            }
        },
        "all_countries": ["United States"],
        "flat": sorted_cities
    }


def parse_location_query(location_str):
    """
    Intelligently parses comma-separated location query parameters while preserving
    'City, ST' pairs (e.g. 'Austin, TX, Seattle, WA' -> ['Austin, TX', 'Seattle, WA']).
    """
    if not location_str or not location_str.strip():
        return []

    parts = [p.strip() for p in location_str.split(',') if p.strip()]
    merged = []
    i = 0
    while i < len(parts):
        curr = parts[i]
        # Check if next token is a 2-letter state code (e.g. 'Austin', 'TX')
        if i + 1 < len(parts) and parts[i + 1].upper() in US_STATE_CODES:
            merged.append(f"{curr}, {parts[i + 1].upper()}")
            i += 2
        else:
            merged.append(curr)
            i += 1
    return merged


def build_location_filter_q(loc_list):
    """
    Translates a list of selected location strings into a comprehensive Django Q filter object.
    Supports:
      - 'United States' (matches all US jobs or unset country)
      - 'Remote' (matches work_mode/city/state remote)
      - 'State (CODE)' e.g. 'California (CA)' -> matches state 'California' or 'CA'
      - 'City, ST' e.g. 'Austin, TX' -> matches city 'Austin' with state 'TX'/'Texas'
      - Plain state name or code
      - Fallback substring search across city, state, country
    """
    if not loc_list:
        return Q()

    q_overall = Q()

    for item in loc_list:
        loc = item.strip()
        if not loc:
            continue

        # 1. Whole country 'United States'
        if loc.lower() in ('united states', 'usa', 'us'):
            q_overall |= (
                Q(country__icontains='United States') |
                Q(country__iexact='USA') |
                Q(country__iexact='US') |
                Q(country__isnull=True) |
                Q(country='')
            )
            continue

        # 2. Remote
        if loc.lower() == 'remote':
            q_overall |= (
                Q(work_mode__icontains='remote') |
                Q(city__icontains='remote') |
                Q(state__icontains='remote')
            )
            continue

        # 3. State with abbreviation in parentheses: e.g. 'California (CA)'
        state_paren_match = re.match(r'^(.+?)\s*\(([A-Za-z]{2})\)$', loc)
        if state_paren_match:
            s_name = state_paren_match.group(1).strip()
            s_code = state_paren_match.group(2).upper()
            q_overall |= Q(state__icontains=s_name) | Q(state__iexact=s_code)
            continue

        # 4. 'City, ST' format: e.g. 'Austin, TX'
        city_st_match = re.match(r'^(.+?),\s*([A-Za-z]{2})$', loc)
        if city_st_match:
            city_name = city_st_match.group(1).strip()
            st_code = city_st_match.group(2).upper()
            full_st_name = US_CODE_TO_STATE_NAME.get(st_code, '')

            st_q = Q(state__iexact=st_code)
            if full_st_name:
                st_q |= Q(state__icontains=full_st_name)

            q_overall |= ((Q(city__icontains=city_name) & st_q) | Q(city__icontains=loc))
            continue

        # 5. Direct state name
        if loc.lower() in US_STATE_NAME_TO_CODE:
            code = US_STATE_NAME_TO_CODE[loc.lower()]
            q_overall |= Q(state__icontains=loc) | Q(state__iexact=code)
            continue

        # 6. Direct state 2-letter code
        if loc.upper() in US_CODE_TO_STATE_NAME:
            name = US_CODE_TO_STATE_NAME[loc.upper()]
            q_overall |= Q(state__iexact=loc.upper()) | Q(state__icontains=name)
            continue

        # 7. Fallback generic search across city, state, country
        q_overall |= Q(city__icontains=loc) | Q(state__icontains=loc) | Q(country__icontains=loc)

    return q_overall
