// Small curated lists to turn free-text fields into pick-a-common-one
// dropdowns, since most users don't know exact numbers (filter L/h) or
// want to type from scratch every time (plant names, city). Every list
// here has an escape hatch ("Other") — never a hard-coded closed set,
// per Principle 3 (never say "not found").

export const FILTER_SUBTYPES: { value: string; label: string }[] = [
  { value: "hang_on_back", label: "Hang-on-back (HOB)" },
  { value: "canister", label: "Canister" },
  { value: "internal", label: "Internal / submersible" },
  { value: "sponge", label: "Sponge" },
  { value: "undergravel", label: "Undergravel" },
  { value: "other", label: "Other" },
];

// Common aquarium plants sold in India — not the full species catalog
// (plants aren't seeded there yet, T-003), just enough to skip typing
// for the most common cases. "Other" always falls through to free text.
export const COMMON_PLANTS: string[] = [
  "Java fern",
  "Anubias",
  "Java moss",
  "Amazon sword",
  "Cryptocoryne",
  "Vallisneria",
  "Hornwort",
  "Water wisteria",
  "Dwarf hairgrass",
  "Water sprite",
  "Red root floater",
  "Duckweed",
  "Rotala",
  "Bacopa",
  "Hygrophila",
];

// Major Indian cities — suggestions only (via <datalist>), any value can
// still be typed and saved. Fixes the "spelling mistake still saved"
// report by making the common case a tap instead of typing, not by
// blocking uncommon or misspelled entries.
export const COMMON_CITIES: string[] = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Ahmedabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Pimpri-Chinchwad",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Kalyan-Dombivli",
  "Vasai-Virar",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Navi Mumbai",
  "Allahabad",
  "Ranchi",
  "Howrah",
  "Coimbatore",
  "Jabalpur",
  "Gwalior",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Guwahati",
  "Chandigarh",
  "Solapur",
  "Dhule",
];
