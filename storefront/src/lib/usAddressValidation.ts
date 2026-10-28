/**
 * Comprehensive US Domestic Address, Phone, and ZIP Code Validation.
 *
 * Enforces strict North American Numbering Plan (NANP) standards and
 * USPS postal prefix boundaries for the 50 US States + District of Columbia.
 * Explicitly rejects non-US inputs, including Indian 6-digit postal codes
 * and foreign phone numbers (+91, etc.).
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
}

// ── US State ZIP Code Prefix Mapping (50 States + DC) ──────────────────────
// Each entry defines the valid 2-digit or 3-digit ZIP code prefixes.
export const US_STATE_ZIP_PREFIXES: Record<string, { name: string; prefixes: string[]; rangeDesc: string }> = {
  AL: { name: "Alabama", prefixes: ["350", "351", "352", "354", "355", "356", "357", "358", "359", "360", "361", "362", "363", "364", "365", "366", "367", "368", "369"], rangeDesc: "350xx–369xx" },
  AK: { name: "Alaska", prefixes: ["995", "996", "997", "998", "999"], rangeDesc: "995xx–999xx" },
  AZ: { name: "Arizona", prefixes: ["850", "851", "852", "853", "855", "856", "857", "859", "860", "863", "864", "865"], rangeDesc: "850xx–865xx" },
  AR: { name: "Arkansas", prefixes: ["716", "717", "718", "719", "720", "721", "722", "723", "724", "725", "726", "727", "728", "729", "755"], rangeDesc: "716xx–729xx" },
  CA: {
    name: "California",
    prefixes: [
      "900", "901", "902", "903", "904", "905", "906", "907", "908", "910",
      "911", "912", "913", "914", "915", "916", "917", "918", "919", "920",
      "921", "922", "923", "924", "925", "926", "927", "928", "930", "931",
      "932", "933", "934", "935", "936", "937", "938", "939", "940", "941",
      "942", "943", "944", "945", "946", "947", "948", "949", "950", "951",
      "952", "953", "954", "955", "956", "957", "958", "959", "960", "961",
    ],
    rangeDesc: "900xx–961xx",
  },
  CO: { name: "Colorado", prefixes: ["800", "801", "802", "803", "804", "805", "806", "807", "808", "809", "810", "811", "812", "813", "814", "815", "816"], rangeDesc: "800xx–816xx" },
  CT: { name: "Connecticut", prefixes: ["060", "061", "062", "063", "064", "065", "066", "067", "068", "069"], rangeDesc: "060xx–069xx" },
  DE: { name: "Delaware", prefixes: ["197", "198", "199"], rangeDesc: "197xx–199xx" },
  DC: { name: "District of Columbia", prefixes: ["200", "201", "202", "203", "204", "205", "569"], rangeDesc: "200xx–205xx" },
  FL: {
    name: "Florida",
    prefixes: [
      "320", "321", "322", "323", "324", "325", "326", "327", "328", "329",
      "330", "331", "332", "333", "334", "335", "336", "337", "338", "339",
      "341", "342", "344", "346", "347", "349",
    ],
    rangeDesc: "320xx–349xx",
  },
  GA: {
    name: "Georgia",
    prefixes: [
      "300", "301", "302", "303", "304", "305", "306", "307", "308", "309",
      "310", "311", "312", "313", "314", "315", "316", "317", "318", "319",
      "398", "399",
    ],
    rangeDesc: "300xx–319xx",
  },
  HI: { name: "Hawaii", prefixes: ["967", "968"], rangeDesc: "967xx–968xx" },
  ID: { name: "Idaho", prefixes: ["832", "833", "834", "835", "836", "837", "838"], rangeDesc: "832xx–838xx" },
  IL: {
    name: "Illinois",
    prefixes: [
      "600", "601", "602", "603", "604", "605", "606", "607", "608", "609",
      "610", "611", "612", "613", "614", "615", "616", "617", "618", "619",
      "620", "622", "623", "624", "625", "626", "627", "628", "629",
    ],
    rangeDesc: "600xx–629xx",
  },
  IN: {
    name: "Indiana",
    prefixes: [
      "460", "461", "462", "463", "464", "465", "466", "467", "468", "469",
      "470", "471", "472", "473", "474", "475", "476", "477", "478", "479",
    ],
    rangeDesc: "460xx–479xx",
  },
  IA: { name: "Iowa", prefixes: ["500", "501", "502", "503", "504", "505", "506", "507", "508", "509", "510", "511", "512", "513", "514", "515", "516", "520", "521", "522", "523", "524", "525", "526", "527", "528"], rangeDesc: "500xx–528xx" },
  KS: { name: "Kansas", prefixes: ["660", "661", "662", "664", "665", "666", "667", "668", "669", "670", "671", "672", "673", "674", "675", "676", "677", "678", "679"], rangeDesc: "660xx–679xx" },
  KY: { name: "Kentucky", prefixes: ["400", "401", "402", "403", "404", "405", "406", "407", "408", "409", "410", "411", "412", "413", "414", "415", "416", "417", "418", "420", "421", "422", "423", "424", "425", "426", "427"], rangeDesc: "400xx–427xx" },
  LA: { name: "Louisiana", prefixes: ["700", "701", "703", "704", "705", "706", "707", "708", "710", "711", "712", "713", "714"], rangeDesc: "700xx–714xx" },
  ME: { name: "Maine", prefixes: ["039", "040", "041", "042", "043", "044", "045", "046", "047", "048", "049"], rangeDesc: "039xx–049xx" },
  MD: { name: "Maryland", prefixes: ["206", "207", "208", "209", "210", "211", "212", "214", "215", "216", "217", "218", "219"], rangeDesc: "206xx–219xx" },
  MA: { name: "Massachusetts", prefixes: ["010", "011", "012", "013", "014", "015", "016", "017", "018", "019", "020", "021", "022", "023", "024", "025", "026", "027", "055"], rangeDesc: "010xx–027xx" },
  MI: {
    name: "Michigan",
    prefixes: [
      "480", "481", "482", "483", "484", "485", "486", "487", "488", "489",
      "490", "491", "492", "493", "494", "495", "496", "497", "498", "499",
    ],
    rangeDesc: "480xx–499xx",
  },
  MN: { name: "Minnesota", prefixes: ["550", "551", "553", "554", "555", "556", "557", "558", "559", "560", "561", "562", "563", "564", "565", "566", "567"], rangeDesc: "550xx–567xx" },
  MS: { name: "Mississippi", prefixes: ["386", "387", "388", "389", "390", "391", "392", "393", "394", "395", "396", "397"], rangeDesc: "386xx–397xx" },
  MO: { name: "Missouri", prefixes: ["630", "631", "633", "634", "635", "636", "637", "638", "639", "640", "641", "644", "645", "646", "647", "648", "650", "651", "652", "653", "654", "655", "656", "657", "658"], rangeDesc: "630xx–658xx" },
  MT: { name: "Montana", prefixes: ["590", "591", "592", "593", "594", "595", "596", "597", "598", "599"], rangeDesc: "590xx–599xx" },
  NE: { name: "Nebraska", prefixes: ["680", "681", "683", "684", "685", "686", "687", "688", "689", "690", "691", "692", "693"], rangeDesc: "680xx–693xx" },
  NV: { name: "Nevada", prefixes: ["889", "890", "891", "893", "894", "895", "897", "898"], rangeDesc: "889xx–898xx" },
  NH: { name: "New Hampshire", prefixes: ["030", "031", "032", "033", "034", "035", "036", "037", "038"], rangeDesc: "030xx–038xx" },
  NJ: { name: "New Jersey", prefixes: ["070", "071", "072", "073", "074", "075", "076", "077", "078", "079", "080", "081", "082", "083", "084", "085", "086", "087", "088", "089"], rangeDesc: "070xx–089xx" },
  NM: { name: "New Mexico", prefixes: ["870", "871", "872", "873", "874", "875", "877", "878", "879", "880", "881", "882", "883", "884"], rangeDesc: "870xx–884xx" },
  NY: {
    name: "New York",
    prefixes: [
      "100", "101", "102", "103", "104", "105", "106", "107", "108", "109",
      "110", "111", "112", "113", "114", "115", "116", "117", "118", "119",
      "120", "121", "122", "123", "124", "125", "126", "127", "128", "129",
      "130", "131", "132", "133", "134", "135", "136", "137", "138", "139",
      "140", "141", "142", "143", "144", "145", "146", "147", "148", "149",
      "063", "005",
    ],
    rangeDesc: "100xx–149xx",
  },
  NC: {
    name: "North Carolina",
    prefixes: [
      "270", "271", "272", "273", "274", "275", "276", "277", "278", "279",
      "280", "281", "282", "283", "284", "285", "286", "287", "288", "289",
    ],
    rangeDesc: "270xx–289xx",
  },
  ND: { name: "North Dakota", prefixes: ["580", "581", "582", "583", "584", "585", "586", "587", "588"], rangeDesc: "580xx–588xx" },
  OH: {
    name: "Ohio",
    prefixes: [
      "430", "431", "432", "433", "434", "435", "436", "437", "438", "439",
      "440", "441", "442", "443", "444", "445", "446", "447", "448", "449",
      "450", "451", "452", "453", "454", "455", "456", "457", "458", "459",
    ],
    rangeDesc: "430xx–459xx",
  },
  OK: { name: "Oklahoma", prefixes: ["730", "731", "734", "735", "736", "737", "738", "739", "740", "741", "743", "744", "745", "746", "747", "748", "749"], rangeDesc: "730xx–749xx" },
  OR: { name: "Oregon", prefixes: ["970", "971", "972", "973", "974", "975", "976", "977", "978", "979"], rangeDesc: "970xx–979xx" },
  PA: {
    name: "Pennsylvania",
    prefixes: [
      "150", "151", "152", "153", "154", "155", "156", "157", "158", "159",
      "160", "161", "162", "163", "164", "165", "166", "167", "168", "169",
      "170", "171", "172", "173", "174", "175", "176", "177", "178", "179",
      "180", "181", "182", "183", "184", "185", "186", "187", "188", "189",
      "190", "191", "192", "193", "194", "195", "196",
    ],
    rangeDesc: "150xx–196xx",
  },
  RI: { name: "Rhode Island", prefixes: ["028", "029"], rangeDesc: "028xx–029xx" },
  SC: { name: "South Carolina", prefixes: ["290", "291", "292", "293", "294", "295", "296", "297", "298", "299"], rangeDesc: "290xx–299xx" },
  SD: { name: "South Dakota", prefixes: ["570", "571", "572", "573", "574", "575", "576", "577"], rangeDesc: "570xx–577xx" },
  TN: { name: "Tennessee", prefixes: ["370", "371", "372", "373", "374", "375", "376", "377", "378", "379", "380", "381", "382", "383", "384", "385"], rangeDesc: "370xx–385xx" },
  TX: {
    name: "Texas",
    prefixes: [
      "750", "751", "752", "753", "754", "755", "756", "757", "758", "759",
      "760", "761", "762", "763", "764", "765", "766", "767", "768", "769",
      "770", "771", "772", "773", "774", "775", "776", "777", "778", "779",
      "780", "781", "782", "783", "784", "785", "786", "787", "788", "789",
      "790", "791", "792", "793", "794", "795", "796", "797", "798", "799",
      "733", "885",
    ],
    rangeDesc: "750xx–799xx",
  },
  UT: { name: "Utah", prefixes: ["840", "841", "842", "843", "844", "845", "846", "847"], rangeDesc: "840xx–847xx" },
  VT: { name: "Vermont", prefixes: ["050", "051", "052", "053", "054", "056", "057", "058", "059"], rangeDesc: "050xx–059xx" },
  VA: {
    name: "Virginia",
    prefixes: [
      "201", "220", "221", "222", "223", "224", "225", "226", "227", "228",
      "229", "230", "231", "232", "233", "234", "235", "236", "237", "238",
      "239", "240", "241", "242", "243", "244", "245", "246",
    ],
    rangeDesc: "220xx–246xx",
  },
  WA: { name: "Washington", prefixes: ["980", "981", "982", "983", "984", "985", "986", "988", "989", "990", "991", "992", "993", "994"], rangeDesc: "980xx–994xx" },
  WV: { name: "West Virginia", prefixes: ["247", "248", "249", "250", "251", "252", "253", "254", "255", "256", "257", "258", "259", "260", "261", "262", "263", "264", "265", "266", "267", "268"], rangeDesc: "247xx–268xx" },
  WI: { name: "Wisconsin", prefixes: ["530", "531", "532", "534", "535", "537", "538", "539", "540", "541", "542", "543", "544", "545", "546", "547", "548", "549"], rangeDesc: "530xx–549xx" },
  WY: { name: "Wyoming", prefixes: ["820", "821", "822", "823", "824", "825", "826", "827", "828", "829", "830", "831"], rangeDesc: "820xx–831xx" },
};

// ── Non-US / Indian Location Disallow List ──────────────────────────────────
const NON_US_LOCATION_TERMS = [
  "india", "bharat", "delhi", "mumbai", "bombay", "bangalore", "bengaluru",
  "hyderabad", "chennai", "madras", "kolkata", "calcutta", "pune", "ahmedabad",
  "jaipur", "surat", "lucknow", "kanpur", "nagpur", "indore", "thane",
  "bhopal", "visakhapatnam", "patna", "vadodara", "ghaziabad", "ludhiana",
  "agra", "nashik", "faridabad", "meerut", "rajkot", "varanasi", "srinagar",
  "aurangabad", "dhanbad", "amritsar", "navi mumbai", "allahabad", "prayagraj",
  "ranchi", "howrah", "coimbatore", "jabalpur", "gwalior", "vijayawada",
  "jodhpur", "madurai", "raipur", "kota", "guwahati", "chandigarh", "solapur",
  "hubli", "dharwad", "bareilly", "moradabad", "mysore", "mysuru", "gurgaon",
  "gurugram", "aligarh", "jalandhar", "tiruchirappalli", "bhubaneswar", "salem",
  "warangal", "mira-bhayandar", "thiruvananthapuram", "bhiwandi", "saharanpur",
  "guntur", "amravati", "bikaner", "noida", "jamshedpur", "bhilai", "cuttack",
  "firozabad", "kochi", "cochin", "nellore", "bhavnagar", "dehradun", "durgapur",
  "asansol", "rourkela", "nanded", "kolhapur", "ajmer", "akola", "gulbarga",
  "jamnagar", "ujjain", "loni", "siliguri", "jhansi", "ulhasnagar", "jammu",
  "sangli-miraj", "mangalore", "mangaluru", "erode", "belgaum", "belagavi",
  "kurnool", "secunderabad", "andhra", "telangana", "karnataka", "tamil nadu",
  "maharashtra", "gujarat", "punjab", "haryana", "rajasthan", "kerala",
  "uttar pradesh", "madhya pradesh", "bihar", "odisha", "west bengal",
  "canada", "united kingdom", "australia", "germany", "france", "china",
];

/**
 * Validates a US Mobile number according to NANP standards.
 * Strips formatting, rejects foreign country codes (+91, etc.),
 * enforces valid area codes and central office codes (cannot start with 0 or 1).
 */
export function validateUsPhone(phone: string, phoneCode = "+1"): ValidationResult {
  const trimmed = phone.trim();

  if (!trimmed) {
    return { isValid: false, error: "Please enter your 10-digit US mobile number." };
  }

  // Explicit check for foreign country codes (e.g. +91, +44, +86, etc.)
  if (trimmed.startsWith("+") && !trimmed.startsWith("+1")) {
    return {
      isValid: false,
      error: "Only US (+1) mobile numbers are supported for domestic USPS fulfillment. International phone numbers are not accepted.",
    };
  }

  // Remove all non-digits
  let digits = trimmed.replace(/\D/g, "");

  // If user included leading US country code 1 with 11 digits, normalize to 10
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  // If phone has 12 or more digits, likely an international number
  if (digits.length > 10) {
    if (digits.startsWith("91") && digits.length === 12) {
      return {
        isValid: false,
        error: "Indian mobile number detected (+91). Domestic Lab requires a valid 10-digit US mobile number.",
      };
    }
    return {
      isValid: false,
      error: "Invalid phone number length. US mobile numbers must contain exactly 10 digits.",
    };
  }

  if (digits.length < 10) {
    return {
      isValid: false,
      error: `US mobile number is incomplete (${digits.length}/10 digits). Please enter a full 10-digit number.`,
    };
  }

  // NANP Rule 1: Area code (first 3 digits) cannot start with 0 or 1
  const areaCode = digits.slice(0, 3);
  if (areaCode.startsWith("0") || areaCode.startsWith("1")) {
    return {
      isValid: false,
      error: `Invalid US area code (${areaCode}). US area codes cannot begin with 0 or 1.`,
    };
  }

  // NANP Rule 2: Central office exchange code (next 3 digits) cannot start with 0 or 1
  const exchangeCode = digits.slice(3, 6);
  if (exchangeCode.startsWith("0") || exchangeCode.startsWith("1")) {
    return {
      isValid: false,
      error: `Invalid US phone exchange code (${exchangeCode}). Exchange codes cannot begin with 0 or 1.`,
    };
  }

  // Formatted as standard US (NXX) NXX-XXXX
  const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

  return { isValid: true, formatted };
}

/**
 * Validates a US ZIP / PIN code.
 * Rejects 6-digit PIN codes (Indian postal codes),
 * enforces 5-digit US ZIP format, and optionally checks prefix matching with selected US state.
 */
export function validateUsZip(zip: string, stateCode?: string): ValidationResult {
  const trimmed = zip.trim();

  if (!trimmed) {
    return { isValid: false, error: "Please enter your 5-digit US PIN / ZIP code." };
  }

  // Detect 6-digit Indian PIN codes
  const pureDigits = trimmed.replace(/\D/g, "");
  if (pureDigits.length === 6) {
    return {
      isValid: false,
      error: `Invalid US PIN: "${trimmed}". US postal codes are 5 digits (e.g., 90210). 6-digit PIN codes (such as Indian postal codes) are not supported.`,
    };
  }

  // Standard 5-digit or 5+4 digit US ZIP regex
  const usZipRegex = /^\d{5}(-\d{4})?$/;
  if (!usZipRegex.test(trimmed)) {
    return {
      isValid: false,
      error: `Invalid US postal format: "${trimmed}". Must be a valid 5-digit ZIP (e.g. 90001) or ZIP+4 (e.g. 90001-1234).`,
    };
  }

  const fiveDigitZip = trimmed.slice(0, 5);
  const prefix3 = fiveDigitZip.slice(0, 3);

  // If a state is selected, cross-validate against that state's USPS prefixes
  if (stateCode && US_STATE_ZIP_PREFIXES[stateCode]) {
    const stateInfo = US_STATE_ZIP_PREFIXES[stateCode];
    const isMatch = stateInfo.prefixes.includes(prefix3);

    if (!isMatch) {
      return {
        isValid: false,
        error: `ZIP code ${fiveDigitZip} does not match the selected state of ${stateInfo.name} (${stateCode}). Expected prefix in ${stateInfo.rangeDesc}.`,
      };
    }
  }

  return { isValid: true, formatted: fiveDigitZip };
}

/**
 * Validates US Street Address.
 * Ensures the presence of a building/house number and street name,
 * and rejects foreign location keywords.
 */
export function validateUsStreetAddress(address: string): ValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { isValid: false, error: "Please enter your Street Address." };
  }

  if (trimmed.length < 5) {
    return { isValid: false, error: "Street Address is too short. Please include house number and street name." };
  }

  const lower = trimmed.toLowerCase();
  for (const term of NON_US_LOCATION_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    if (regex.test(lower)) {
      return {
        isValid: false,
        error: `Invalid domestic address: "${term}" is an international location. Domestic Lab fulfills orders exclusively within the United States.`,
      };
    }
  }

  // A valid US street address should have at least one digit (house/building number)
  // and some letters for the street name (e.g., "123 Main St", "Suite 4B, 740 Broadway")
  const hasDigit = /\d/.test(trimmed);
  const hasLetter = /[a-zA-Z]/.test(trimmed);

  if (!hasDigit || !hasLetter) {
    return {
      isValid: false,
      error: "Please enter a complete US street address with building number and street name (e.g., 742 Evergreen Terrace).",
    };
  }

  return { isValid: true };
}

/**
 * Validates US City name.
 * Rejects numbers, special characters, and foreign location names.
 */
export function validateUsCity(city: string): ValidationResult {
  const trimmed = city.trim();

  if (!trimmed) {
    return { isValid: false, error: "Please enter your City." };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: "City name must be at least 2 characters." };
  }

  if (/\d/.test(trimmed)) {
    return { isValid: false, error: "City name cannot contain numbers." };
  }

  const lower = trimmed.toLowerCase();
  for (const term of NON_US_LOCATION_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    if (regex.test(lower)) {
      return {
        isValid: false,
        error: `Invalid domestic city: "${term}" is outside the United States. Only US cities are eligible for domestic delivery.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Auto-formats phone input on typing into (XXX) XXX-XXXX
 */
export function formatUsPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
