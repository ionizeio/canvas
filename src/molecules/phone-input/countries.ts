// The country list PhoneInput picks from when the caller passes none: a curated,
// alphabetical set of the countries most apps ship to, each with its ISO 3166-1
// alpha-2 code, English name, and ITU dial prefix. It is deliberately NOT the full
// ISO register (that is 249 rows of data the kit would have to keep correct); pass
// `countries` for a complete, localized, or reordered list. The flag glyph is derived
// from the code (see `flagOf`), so a row never carries one of its own here.

/** A country PhoneInput can pick: the stored code, the shown name, the dial prefix. */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 code, the stored value ("US"). */
  code: string;
  /** Display name ("United States"). */
  name: string;
  /** Dial prefix with its plus sign ("+1"). */
  dialCode: string;
  /**
   * Flag glyph shown in the trigger and the row. Derived from `code` as the two
   * regional-indicator symbols (🇺🇸) when omitted, which every platform's emoji
   * font renders; pass one to override it.
   */
  flag?: string;
}

/** The flag emoji for an ISO alpha-2 code ("US" -> 🇺🇸): two regional-indicator symbols. */
export function flagOf(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** The default country list, alphabetical by name. */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { code: "AR", name: "Argentina", dialCode: "+54" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "AT", name: "Austria", dialCode: "+43" },
  { code: "BD", name: "Bangladesh", dialCode: "+880" },
  { code: "BE", name: "Belgium", dialCode: "+32" },
  { code: "BR", name: "Brazil", dialCode: "+55" },
  { code: "BG", name: "Bulgaria", dialCode: "+359" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "CL", name: "Chile", dialCode: "+56" },
  { code: "CN", name: "China", dialCode: "+86" },
  { code: "CO", name: "Colombia", dialCode: "+57" },
  { code: "HR", name: "Croatia", dialCode: "+385" },
  { code: "CZ", name: "Czechia", dialCode: "+420" },
  { code: "DK", name: "Denmark", dialCode: "+45" },
  { code: "EG", name: "Egypt", dialCode: "+20" },
  { code: "FI", name: "Finland", dialCode: "+358" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "GH", name: "Ghana", dialCode: "+233" },
  { code: "GR", name: "Greece", dialCode: "+30" },
  { code: "HK", name: "Hong Kong", dialCode: "+852" },
  { code: "HU", name: "Hungary", dialCode: "+36" },
  { code: "IS", name: "Iceland", dialCode: "+354" },
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "ID", name: "Indonesia", dialCode: "+62" },
  { code: "IE", name: "Ireland", dialCode: "+353" },
  { code: "IL", name: "Israel", dialCode: "+972" },
  { code: "IT", name: "Italy", dialCode: "+39" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "KE", name: "Kenya", dialCode: "+254" },
  { code: "LU", name: "Luxembourg", dialCode: "+352" },
  { code: "MY", name: "Malaysia", dialCode: "+60" },
  { code: "MX", name: "Mexico", dialCode: "+52" },
  { code: "MA", name: "Morocco", dialCode: "+212" },
  { code: "NL", name: "Netherlands", dialCode: "+31" },
  { code: "NZ", name: "New Zealand", dialCode: "+64" },
  { code: "NG", name: "Nigeria", dialCode: "+234" },
  { code: "NO", name: "Norway", dialCode: "+47" },
  { code: "PK", name: "Pakistan", dialCode: "+92" },
  { code: "PE", name: "Peru", dialCode: "+51" },
  { code: "PH", name: "Philippines", dialCode: "+63" },
  { code: "PL", name: "Poland", dialCode: "+48" },
  { code: "PT", name: "Portugal", dialCode: "+351" },
  { code: "QA", name: "Qatar", dialCode: "+974" },
  { code: "RO", name: "Romania", dialCode: "+40" },
  { code: "RU", name: "Russia", dialCode: "+7" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "RS", name: "Serbia", dialCode: "+381" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "SK", name: "Slovakia", dialCode: "+421" },
  { code: "SI", name: "Slovenia", dialCode: "+386" },
  { code: "ZA", name: "South Africa", dialCode: "+27" },
  { code: "KR", name: "South Korea", dialCode: "+82" },
  { code: "ES", name: "Spain", dialCode: "+34" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94" },
  { code: "SE", name: "Sweden", dialCode: "+46" },
  { code: "CH", name: "Switzerland", dialCode: "+41" },
  { code: "TW", name: "Taiwan", dialCode: "+886" },
  { code: "TH", name: "Thailand", dialCode: "+66" },
  { code: "TR", name: "Türkiye", dialCode: "+90" },
  { code: "UA", name: "Ukraine", dialCode: "+380" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "VE", name: "Venezuela", dialCode: "+58" },
  { code: "VN", name: "Vietnam", dialCode: "+84" },
];
