// Osman Zakir
// 3 / 16 / 2018 (date for when work on this application started--these comments were put here on 8 / 20 / 2018)
// This is the JavaScript code for the Google Maps GUI + Currency Converter web application. It shows a Google Map
// with an info window appearing on the user's geolocation coordinates with an HTML form centered on it.  The form
// has an input element to type in the amount of money in the base currency to convert, two dropdown menus populated
// with a list of currencies requested from the currency API, and a button to submit the form. The API access key is
// requested from the backend server application which is holding it in an environment variable to use there as well.
// The "from" currency dropdown by default selects USD (and the current currency API doesn't allow changing it, which is why
// the "from" dropdown menu is going to be disabled), with the "to" currency dropdown selecting the currency used at the
// the place where the info window is opened in. Functionality to react to a click event on the map is also included: when
// a user clicks on the map, a new info window is opened there (the previous one is closed when the new is opened or when
// the user uses the Places Search Box to search for and move to another place on the map, and the app will use Google's
// Geocoding Service to take the coordinates at that location to reverse geocode it. The "to" currency dropown will switch
// to that place's currency.

// When the app tries to reverse geocode Kosovo, Western Sahara or Wake Island, however, although the the reverse geocoding does
// technically work, there are no results to show which is why a "ZERO_RESULTS" status is returned. In this situation, the "to"
// dropdown menu will be showing AED regardless of whether that's the correct currency or not. This behavior for when the app
// tries to reverse geocode these three places is explained via a paragraph element on the info window above the two dropdown menus

// The below object, countryMap, is an object holding currency data on each country or region; the two letter ISO country code and the
// the currency abbreviation for each country is included.  People who read this code do not need to look at the whole object.  They only
// need to know it's there and is doing the country to currency mapping required by this application.  Please start reading the code from
// line 1027.

"use strict";
const countryMap = {
  "Afghanistan": {
    "abbreviation": "AF",
    "currency": "AFN"
  },
  "Albania": {
    "abbreviation": "AL",
    "currency": "ALL"
  },
  "Algeria": {
    "abbreviation": "DZ",
    "currency": "DZD"
  },
  "American Samoa": {
    "abbreviation": "AS",
    "currency": "USD"
  },
  "Andorra": {
    "abbreviation": "AD",
    "currency": "EUR"
  },
  "Angola": {
    "abbreviation": "AO",
    "currency": "AOA"
  },
  "Anguilla": {
    "abbreviation": "AI",
    "currency": "XCD"
  },
  "Antarctica": {
    "abbreviation": "AQ",
    "currency": "XCD"
  },
  "Antigua and Barbuda": {
    "abbreviation": "AG",
    "currency": "XCD"
  },
  "Argentina": {
    "abbreviation": "AR",
    "currency": "ARS"
  },
  "Armenia": {
    "abbreviation": "AM",
    "currency": "AMD"
  },
  "Aruba": {
    "abbreviation": "AW",
    "currency": "AWG"
  },
  "Saint Helena, Ascension and Tristan da Cunha": {
    "abbreviation": "AC",
    "currency": "SHP"
  },
  "Australia": {
    "abbreviation": "AU",
    "currency": "AUD"
  },
  "Austria": {
    "abbreviation": "AT",
    "currency": "EUR"
  },
  "Azerbaijan": {
    "abbreviation": "AZ",
    "currency": "AZN"
  },
  "The Bahamas": {
    "abbreviation": "BS",
    "currency": "BSD"
  },
  "Bahrain": {
    "abbreviation": "BH",
    "currency": "BHD"
  },
  "Bangladesh": {
    "abbreviation": "BD",
    "currency": "BDT"
  },
  "Barbados": {
    "abbreviation": "BB",
    "currency": "BBD"
  },
  "Belarus": {
    "abbreviation": "BY",
    "currency": "BYR"
  },
  "Belgium": {
    "abbreviation": "BE",
    "currency": "EUR"
  },
  "Belize": {
    "abbreviation": "BZ",
    "currency": "BZD"
  },
  "Benin": {
    "abbreviation": "BJ",
    "currency": "XOF"
  },
  "Bermuda": {
    "abbreviation": "BM",
    "currency": "BMD"
  },
  "Bhutan": {
    "abbreviation": "BT",
    "currency": "BTN"
  },
  "Bolivia": {
    "abbreviation": "BO",
    "currency": "BOB"
  },
  "Bosnia and Herzegovina": {
    "abbreviation": "BA",
    "currency": "BAM"
  },
  "Botswana": {
    "abbreviation": "BW",
    "currency": "BWP"
  },
  "Bouvet Island": {
    "abbreviation": "BV",
    "currency": "NOK"
  },
  "Brazil": {
    "abbreviation": "BR",
    "currency": "BRL"
  },
  "British Indian Ocean Territory": {
    "abbreviation": "IO",
    "currency": "GBP"
  },
  "British Virgin Islands": {
    "abbreviation": "VG",
    "currency": "USD"
  },
  "Brunei": {
    "abbreviation": "BN",
    "currency": "BND"
  },
  "Bulgaria": {
    "abbreviation": "BG",
    "currency": "BGN"
  },
  "Burkina Faso": {
    "abbreviation": "BF",
    "currency": "XOF"
  },
  "Burundi": {
    "abbreviation": "BI",
    "currency": "BIF"
  },
  "Cambodia": {
    "abbreviation": "KH",
    "currency": "KHR"
  },
  "Cameroon": {
    "abbreviation": "CM",
    "currency": "XAF"
  },
  "Canada": {
    "abbreviation": "CA",
    "currency": "CAD"
  },
  "Cape Verde": {
    "abbreviation": "CV",
    "currency": "CVE"
  },
  "Caribbean Netherlands": {
    "abbreviation": "BQ",
    "currency": "USD"
  },
  "Cayman Islands": {
    "abbreviation": "KY",
    "currency": "KYD"
  },
  "Central African Republic": {
    "abbreviation": "CF",
    "currency": "XAF"
  },
  "Chad": {
    "abbreviation": "TD",
    "currency": "XAF"
  },
  "Chile": {
    "abbreviation": "CL",
    "currency": "CLP"
  },
  "China": {
    "abbreviation": "CN",
    "currency": "CNY"
  },
  "Christmas Island": {
    "abbreviation": "CX",
    "currency": "AUD"
  },
  "Cocos (Keeling) Islands": {
    "abbreviation": "CC",
    "currency": "AUD"
  },
  "Colombia": {
    "abbreviation": "CO",
    "currency": "COP"
  },
  "Comoros": {
    "abbreviation": "KM",
    "currency": "KMF"
  },
  "Cook Islands": {
    "abbreviation": "CK",
    "currency": "NZD"
  },
  "Costa Rica": {
    "abbreviation": "CR",
    "currency": "CRC"
  },
  "Cote d'Ivoire": {
    "abbreviation": "CI",
    "currency": "XOF"
  },
  "Croatia": {
    "abbreviation": "HR",
    "currency": "HRK"
  },
  "Cuba": {
    "abbreviation": "CU",
    "currency": "CUP"
  },
  "Curacao": {
    "abbreviation": "CW",
    "currency": "ANG"
  },
  "Cyprus": {
    "abbreviation": "CY",
    "currency": "EUR"
  },
  "Czechia": {
    "abbreviation": "CZ",
    "currency": "CZK"
  },
  "Denmark": {
    "abbreviation": "DK",
    "currency": "DKK"
  },
  "Democratic Republic of the Congo": {
    "abbreviation": "CD",
    "currency": "CDF"
  },
  "Djibouti": {
    "abbreviation": "DJ",
    "currency": "DJF"
  },
  "Dominica": {
    "abbreviation": "DM",
    "currency": "XCD"
  },
  "Dominican Republic": {
    "abbreviation": "DO",
    "currency": "DOP"
  },
  "Ecuador": {
    "abbreviation": "EC",
    "currency": "USD"
  },
  "Egypt": {
    "abbreviation": "EG",
    "currency": "EGP"
  },
  "El Salvador": {
    "abbreviation": "SV",
    "currency": "SVC"
  },
  "Equatorial Guinea": {
    "abbreviation": "GQ",
    "currency": "XAF"
  },
  "Eritrea": {
    "abbreviation": "ER",
    "currency": "ERN"
  },
  "Estonia": {
    "abbreviation": "EE",
    "currency": "EUR"
  },
  "Ethiopia": {
    "abbreviation": "ET",
    "currency": "ETB"
  },
  "Falkland Islands (Islas Malvinas)": {
    "abbreviation": "FK",
    "currency": "FKP"
  },
  "Faroe Islands": {
    "abbreviation": "FO",
    "currency": "DKK"
  },
  "Federated States of Micronesia": {
    "abbreviation": "FM",
    "currency": "USD"
  },
  "Fiji": {
    "abbreviation": "FJ",
    "currency": "FJD"
  },
  "Finland": {
    "abbreviation": "FI",
    "currency": "EUR"
  },
  "France": {
    "abbreviation": "FR",
    "currency": "EUR"
  },
  "French Guiana": {
    "abbreviation": "GF",
    "currency": "EUR"
  },
  "French Polynesia": {
    "abbreviation": "PF",
    "currency": "XPF"
  },
  "French Southern and Antarctic Lands": {
    "abbreviation": "TF",
    "currency": "EUR"
  },
  "Gabon": {
    "abbreviation": "GA",
    "currency": "XAF"
  },
  "Georgia": {
    "abbreviation": "GE",
    "currency": "GEL"
  },
  "Germany": {
    "abbreviation": "DE",
    "currency": "EUR"
  },
  "Ghana": {
    "abbreviation": "GH",
    "currency": "GHS"
  },
  "Gibraltar": {
    "abbreviation": "GI",
    "currency": "GIP"
  },
  "Greece": {
    "abbreviation": "GR",
    "currency": "EUR"
  },
  "Greenland": {
    "abbreviation": "GL",
    "currency": "DKK"
  },
  "Grenada": {
    "abbreviation": "GD",
    "currency": "XCD"
  },
  "Guadeloupe": {
    "abbreviation": "GP",
    "currency": "EUR"
  },
  "Guam": {
    "abbreviation": "GU",
    "currency": "USD"
  },
  "Guatemala": {
    "abbreviation": "GT",
    "currency": "GTQ"
  },
  "Guernsey": {
    "abbreviation": "GG",
    "currency": "GGP"
  },
  "Guinea": {
    "abbreviation": "GN",
    "currency": "GNF"
  },
  "Guinea-Bissau": {
    "abbreviation": "GW",
    "currency": "XOF"
  },
  "Guyana": {
    "abbreviation": "GY",
    "currency": "GYD"
  },
  "Haiti": {
    "abbreviation": "HT",
    "currency": "HTG"
  },
  "Heard Island and McDonald Islands": {
    "abbreviation": "HM",
    "currency": "AUD"
  },
  "Honduras": {
    "abbreviation": "HN",
    "currency": "HNL"
  },
  "Hong Kong": {
    "abbreviation": "HK",
    "currency": "HKD"
  },
  "Hungary": {
    "abbreviation": "HU",
    "currency": "HUF"
  },
  "Iceland": {
    "abbreviation": "IS",
    "currency": "ISK"
  },
  "India": {
    "abbreviation": "IN",
    "currency": "INR"
  },
  "Indonesia": {
    "abbreviation": "ID",
    "currency": "IDR"
  },
  "Iran": {
    "abbreviation": "IR",
    "currency": "IRR"
  },
  "Iraq": {
    "abbreviation": "IQ",
    "currency": "IQD"
  },
  "Ireland": {
    "abbreviation": "IE",
    "currency": "EUR"
  },
  "Isle of Man": {
    "abbreviation": "IM",
    "currency": "IMP"
  },
  "Israel": {
    "abbreviation": "IL",
    "currency": "ILS"
  },
  "Italy": {
    "abbreviation": "IT",
    "currency": "EUR"
  },
  "Jamaica": {
    "abbreviation": "JM",
    "currency": "JMD"
  },
  "Japan": {
    "abbreviation": "JP",
    "currency": "JPY"
  },
  "Jersey": {
    "abbreviation": "JE",
    "currency": "JEP"
  },
  "Jordan": {
    "abbreviation": "JO",
    "currency": "JOD"
  },
  "Kazakhstan": {
    "abbreviation": "KZ",
    "currency": "KZT"
  },
  "Kenya": {
    "abbreviation": "KE",
    "currency": "KES"
  },
  "Kiribati": {
    "abbreviation": "KI",
    "currency": "AUD"
  },
  "Kosovo": {
    "abbreviation": "XK",
    "currency": "EUR"
  },
  "Kuwait": {
    "abbreviation": "KW",
    "currency": "KWD"
  },
  "Kyrgyzstan": {
    "abbreviation": "KG",
    "currency": "KGS"
  },
  "Laos": {
    "abbreviation": "LA",
    "currency": "LAK"
  },
  "Latvia": {
    "abbreviation": "LV",
    "currency": "EUR"
  },
  "Lebanon": {
    "abbreviation": "LB",
    "currency": "LBP"
  },
  "Lesotho": {
    "abbreviation": "LS",
    "currency": "LSL"
  },
  "Liberia": {
    "abbreviation": "LR",
    "currency": "LRD"
  },
  "Libya": {
    "abbreviation": "LY",
    "currency": "LYD"
  },
  "Liechtenstein": {
    "abbreviation": "LI",
    "currency": "CHF"
  },
  "Lithuania": {
    "abbreviation": "LT",
    "currency": "EUR"
  },
  "Luxembourg": {
    "abbreviation": "LU",
    "currency": "EUR"
  },
  "Macau": {
    "abbreviation": "MO",
    "currency": "MOP"
  },
  "Macedonia (FYROM)": {
    "abbreviation": "MK",
    "currency": "MKD"
  },
  "Madagascar": {
    "abbreviation": "MG",
    "currency": "MGA"
  },
  "Malawi": {
    "abbreviation": "MW",
    "currency": "MWK"
  },
  "Malaysia": {
    "abbreviation": "MY",
    "currency": "MYR"
  },
  "Maldives": {
    "abbreviation": "MV",
    "currency": "MVR"
  },
  "Mali": {
    "abbreviation": "ML",
    "currency": "XOF"
  },
  "Malta": {
    "abbreviation": "MT",
    "currency": "EUR"
  },
  "Marshall Islands": {
    "abbreviation": "MH",
    "currency": "USD"
  },
  "Martinique": {
    "abbreviation": "MQ",
    "currency": "EUR"
  },
  "Mauritania": {
    "abbreviation": "MR",
    "currency": "MRO"
  },
  "Mauritius": {
    "abbreviation": "MU",
    "currency": "MUR"
  },
  "Mayotte": {
    "abbreviation": "YT",
    "currency": "EUR"
  },
  "Mexico": {
    "abbreviation": "MX",
    "currency": "MXN"
  },
  "Moldova": {
    "abbreviation": "MD",
    "currency": "MDL"
  },
  "Monaco": {
    "abbreviation": "MC",
    "currency": "EUR"
  },
  "Mongolia": {
    "abbreviation": "MN",
    "currency": "MNT"
  },
  "Montserrat": {
    "abbreviation": "MS",
    "currency": "XCD"
  },
  "Montenegro": {
    "abbreviation": "ME",
    "currency": "EUR"
  },
  "Morocco": {
    "abbreviation": "MA",
    "currency": "MAD"
  },
  "Mozambique": {
    "abbreviation": "MZ",
    "currency": "MZN"
  },
  "Myanmar (Burma)": {
    "abbreviation": "MM",
    "currency": "MMK"
  },
  "Namibia": {
    "abbreviation": "NA",
    "currency": "NAD"
  },
  "Nauru": {
    "abbreviation": "NR",
    "currency": "AUD"
  },
  "Nepal": {
    "abbreviation": "NP",
    "currency": "NPR"
  },
  "Netherlands": {
    "abbreviation": "NL",
    "currency": "EUR"
  },
  "Netherlands Antilles": {
    "abbreviation": "AN",
    "currency": "ANG"
  },
  "New Caledonia": {
    "abbreviation": "NC",
    "currency": "XPF"
  },
  "New Zealand": {
    "abbreviation": "NZ",
    "currency": "NZD"
  },
  "Nicaragua": {
    "abbreviation": "NI",
    "currency": "NIO"
  },
  "Niger": {
    "abbreviation": "NE",
    "currency": "XOF"
  },
  "Nigeria": {
    "abbreviation": "NG",
    "currency": "NGN"
  },
  "Niue": {
    "abbreviation": "NU",
    "currency": "NZD"
  },
  "Norfolk Island": {
    "abbreviation": "NF",
    "currency": "AUD"
  },
  "Northern Mariana Islands": {
    "abbreviation": "MP",
    "currency": "USD"
  },
  "North Korea": {
    "abbreviation": "KP",
    "currency": "KPW"
  },
  "Norway": {
    "abbreviation": "NO",
    "currency": "NOK"
  },
  "Oman": {
    "abbreviation": "OM",
    "currency": "OMR"
  },
  "Pakistan": {
    "abbreviation": "PK",
    "currency": "PKR"
  },
  "Palau": {
    "abbreviation": "PW",
    "currency": "USD"
  },
  "Palestinian Territories": {
    "abbreviation": "PS",
    "currency": "ILS"
  },
  "Panama": {
    "abbreviation": "PA",
    "currency": "PAB"
  },
  "Papua New Guinea": {
    "abbreviation": "PGK",
    "currency": "PGK"
  },
  "Paraguay": {
    "abbreviation": "PY",
    "currency": "PYG"
  },
  "Peru": {
    "abbreviation": "PE",
    "currency": "PEN"
  },
  "Philippines": {
    "abbreviation": "PH",
    "currency": "PHP"
  },
  "Pitcairn Islands": {
    "abbreviation": "PN",
    "currency": "NZD"
  },
  "Poland": {
    "abbreviation": "PL",
    "currency": "PLN"
  },
  "Portugal": {
    "abbreviation": "PT",
    "currency": "EUR"
  },
  "Puerto Rico": {
    "abbreviation": "PR",
    "currency": "USD"
  },
  "Qatar": {
    "abbreviation": "QA",
    "currency": "QAR"
  },
  "Republic of the Congo": {
    "abbreviation": "CG",
    "currency": "XAF"
  },
  "Reunion": {
    "abbreviation": "RE",
    "currency": "USD"
  },
  "Romania": {
    "abbreviation": "RO",
    "currency": "RON"
  },
  "Russia": {
    "abbreviation": "RU",
    "currency": "RUB"
  },
  "Rwanda": {
    "abbreviation": "RW",
    "currency": "RWF"
  },
  "Saint Barthelemy": {
    "abbreviation": "BL",
    "currency": "EUR"
  },
  "Saint Kitts and Nevis": {
    "abbreviation": "KN",
    "currency": "XCD"
  },
  "Saint Lucia": {
    "abbreviation": "LC",
    "currency": "XCD"
  },
  "Saint Martin": {
    "abbreviation": "MF",
    "currency": "EUR"
  },
  "Saint Pierre and Miquelon": {
    "abbreviation": "PM",
    "currency": "EUR"
  },
  "Saint Vincent and the Grenadines": {
    "abbreviation": "VC",
    "currency": "XCD"
  },
  "Samoa": {
    "abbreviation": "WS",
    "currency": "WST"
  },
  "San Marino": {
    "abbreviation": "SM",
    "currency": "EUR"
  },
  "Sao Tome and Principe": {
    "abbreviation": "ST",
    "currency": "STD"
  },
  "Saudi Arabia": {
    "abbreviation": "SA",
    "currency": "SAR"
  },
  "Senegal": {
    "abbreviation": "SN",
    "currency": "XOF"
  },
  "Serbia": {
    "abbreviation": "RS",
    "currency": "RSD"
  },
  "Seychelles": {
    "abbreviation": "SC",
    "currency": "SCR"
  },
  "Sierra Leone": {
    "abbreviation": "SL",
    "currency": "SLL"
  },
  "Singapore": {
    "abbreviation": "SG",
    "currency": "SGD"
  },
  "Sint Maarten": {
    "abbreviation": "SX",
    "currency": "ANG"
  },
  "Slovakia": {
    "abbreviation": "SK",
    "currency": "EUR"
  },
  "Slovenia": {
    "abbreviation": "SI",
    "currency": "EUR"
  },
  "Solomon Islands": {
    "abbreviation": "SB",
    "currency": "SBD"
  },
  "Somalia": {
    "abbreviation": "SO",
    "currency": "SOS"
  },
  "South Africa": {
    "abbreviation": "ZA",
    "currency": "ZAR"
  },
  "South Georgia and the South Sandwich Islands": {
    "abbreviation": "GS",
    "currency": "FKP"
  },
  "South Korea": {
    "abbreviation": "KR",
    "currency": "KRW"
  },
  "Spain": {
    "abbreviation": "ES",
    "currency": "EUR"
  },
  "Sri Lanka": {
    "abbreviation": "LK",
    "currency": "LKR"
  },
  "Sudan": {
    "abbreviation": "SD",
    "currency": "SDG"
  },
  "Suriname": {
    "abbreviation": "SR",
    "currency": "SRD"
  },
  "Svalbard and Jan Mayen": {
    "abbreviation": "SJ",
    "currency": "NOK"
  },
  "Swaziland": {
    "abbreviation": "SZ",
    "currency": "SZL"
  },
  "Sweden": {
    "abbreviation": "SE",
    "currency": "SEK"
  },
  "Switzerland": {
    "abbreviation": "CH",
    "currency": "CHF"
  },
  "Syria": {
    "abbreviation": "SY",
    "currency": "SYP"
  },
  "Taiwan": {
    "abbreviation": "TW",
    "currency": "TWD"
  },
  "Tajikistan": {
    "abbreviation": "TJ",
    "currency": "TJS"
  },
  "Tanzania": {
    "abbreviation": "TZ",
    "currency": "TZS"
  },
  "Thailand": {
    "abbreviation": "TH",
    "currency": "THB"
  },
  "The Gambia": {
    "abbreviation": "GM",
    "currency": "GMD"
  },
  "Timor-Leste": {
    "abbreviation": "TL",
    "currency": "USD"
  },
  "Togo": {
    "abbreviation": "TG",
    "currency": "XOF"
  },
  "Tokelau": {
    "abbreviation": "TK",
    "currency": "NZD"
  },
  "Tonga": {
    "abbreviation": "TO",
    "currency": "TOP"
  },
  "Trinidad and Tobago": {
    "abbreviation": "TT",
    "currency": "TTD"
  },
  "Tunisia": {
    "abbreviation": "TN",
    "currency": "TND"
  },
  "Turkey": {
    "abbreviation": "TR",
    "currency": "TRY"
  },
  "Turkmenistan": {
    "abbreviation": "TM",
    "currency": "TMT"
  },
  "Turks and Caicos Islands": {
    "abbreviation": "TC",
    "currency": "USD"
  },
  "Tuvalu": {
    "abbreviation": "TV",
    "currency": "AUD"
  },
  "United States Minor Outlying Islands": {
    "abbreviation": "UM",
    "currency": "USD"
  },
  "Uganda": {
    "abbreviation": "UG",
    "currency": "UGX"
  },
  "Ukraine": {
    "abbreviation": "UA",
    "currency": "UAH"
  },
  "United Arab Emirates": {
    "abbreviation": "AE",
    "currency": "AED"
  },
  "United Kingdom": {
    "abbreviation": "UK",
    "currency": "GBP"
  },
  "United States": {
    "abbreviation": "US",
    "currency": "USD"
  },
  "Uruguay": {
    "abbreviation": "UY",
    "currency": "UYU"
  },
  "U.S. Virgin Islands": {
    "abbreviation": "VI",
    "currency": "USD"
  },
  "Uzbekistan": {
    "abbreviation": "UZ",
    "currency": "UZS"
  },
  "Vanuatu": {
    "abbreviation": "VU",
    "currency": "VUV"
  },
  "Vatican City": {
    "abbreviation": "VA",
    "currency": "EUR"
  },
  "Venezuela": {
    "abbreviation": "VE",
    "currency": "VEF"
  },
  "Vietnam": {
    "abbreviation": "VN",
    "currency": "VND"
  },
  "Wallis and Futuna": {
    "abbreviation": "WF",
    "currency": "XPF"
  },
  "Western Sahara": {
    "abbreviation": "EH",
    "currency": "MAD"
  },
  "Yemen": {
    "abbreviation": "YE",
    "currency": "YER"
  },
  "Zambia": {
    "abbreviation": "ZM",
    "currency": "ZMW"
  },
  "Zimbabwe": {
    "abbreviation": "ZW",
    "currency": "ZWL"
  }
};

let map, infoWindow, form;
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -34.397, lng: 150.644 },
    zoom: 6
  });
  infoWindow = new google.maps.InfoWindow();

  // Try HTML5 Geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Declare variables to help create form
      let lineBr1, lineBr2, select1, select2, labelFrom, labelTo, input1, input2;

      // Call function to fill info window (which will also instantiate and fill the form, then return it)
      form = fillInfoWindow(lineBr1, lineBr2, select1, select2, labelFrom, labelTo, input1, input2, location);

      // Place form inside info window
      infoWindow.setPosition(location);
      infoWindow.setContent(form);
      infoWindow.open(map);
      map.setCenter(location);

      // Generate click event for when a user clicks anywhere on the map, and open an info window there
      map.addListener("click", function(e) {
        form = fillInfoWindow(lineBr1, lineBr2, select1, select2, labelFrom, labelTo, input1, input2, e.latLng);
        infoWindow.setPosition(e.latLng);
        infoWindow.setContent(form);
        infoWindow.open(map);
        map.setCenter(e.latLng);
      });
    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }

  // Create the search box and link it to the UI element.
  const searchInput = document.getElementById("search-input");
  const searchBox = new google.maps.places.SearchBox(searchInput);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchInput);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener("bounds_changed", function () {
    searchBox.setBounds(map.getBounds());
  });

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener("places_changed", function () {
    const places = searchBox.getPlaces();

    if (places.length === 0) {
      return;
    }

    // For each place, get the name and location.
    const bounds = new google.maps.LatLngBounds();
    places.forEach(function (place) {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
    map.setZoom(6);
    infoWindow.close();
  });
}

function getCurrencyAbbreviation(countryName) {
  const country = countryMap[countryName];
  if (country) {
    return country.currency;
  }
  return undefined;
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  let input1, lineBr1, labelFrom, select1, lineBr2, labelTo, select2, input2;

  form = fillInfoWindow(input1, lineBr1, labelFrom, select1, lineBr2, labelTo, select2, input2, pos);

  // To check if Geolocation is available
  infoWindow.setPosition(pos);
  infoWindow.setContent((browserHasGeolocation
    ? "Error: The Geolocation service failed." +
    "If you see this error, just click anywhere on the map and an info window with a form will appear there"
    : "Error: Your browser doesn't support geolocation." +
        "If you see this error, just click anywhere on the map and an info window with a form will appear there") + form);
  infoWindow.open(map);

  // Generate click event for when a user clicks on a place on the map
  map.addListener("click", function (e) {
    infoWindow.close();
    form = fillInfoWindow(lineBr1, lineBr2, select1, select2, labelFrom, labelTo, input1, input2, e.latLng);
    infoWindow.setPosition(e.latLng);
    infoWindow.setContent(form);
    form.classList.add("inner-form");
    infoWindow.open(map);
    map.setCenter(e.latLng);
  });
}

function fillInfoWindow(input1, lineBr1, labelFrom, select1, lineBr2, labelTo, select2, input2, location) {
  // Assign values to variables in the order they'll be put onto the info window in
  // form elements are also assigned values to in the order that they'll be appended
  // to the parent form node in.
  form = createForm();
  const para = document.createElement("p");
  para.textContent = "Note: Antarctica doesn't really have a currency; each country in the world has " +
      "research centers set up there and those research centers use their respective countries' currencies. " +
      "Keep that in mind when trying to see what currency Antarctica has. This app will say \"XCD\"--but " +
      "that's not completely accurate for the reason already given. Also note that because the current currency " +
      "API doesn't allow changing the base currency (default is USD), the \"from\" dropdown menu is disabled. " +
      "The currency API also only updates their data every hour, so results may be off by some amount.";
  para.style.textAlign = "left";
  input1 = createInput("text", "currency_amount", "Amount");
  lineBr1 = document.createElement("br");
  labelFrom = document.createElement("label");
  labelFrom.textContent = "From: ";
  select1 = createSelect("from_currency", "from", "From");
  lineBr2 = document.createElement("br");
  labelTo = document.createElement("label");
  labelTo.textContent = "To: ";
  select2 = createSelect("to_currency", "to", "To");

  fetch("https://dragonosman.dynu.net:5501/?q=currency_list")
    .then(res => res.json())
    .then(data => {
      for (const [key, value] of Object.entries(data)) {
        const option = document.createElement("option");
        option.name = key;
        option.id = key;
        option.textContent = `${key} - ${value}`;
        select1.append(option);
        select2.append(option.cloneNode(true));
      }

      for (const option of select1.options) {
        option.selected = option.id === "USD";
        select1.disabled = true;
      }

      let country = null;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ "location": location }, function (geocodeResults, status) {
        let currencyAbbr;
        if (status === "OK") {
          for (let r = 0, rl = geocodeResults.length; r < rl; r++) {
            const result = geocodeResults[r];
            if (!country && result.types[0] === "country") {
              country = result.address_components[0].long_name;
              currencyAbbr = getCurrencyAbbreviation(country);
            } else if (!country && result.types[0] === "archipelago") {
              country = result.address_components[0].long_name;
            }
          }
        } else {
          const errorReportP = document.createElement("p");
          errorReportP.textContent += `Google Geocoding Service not working for the following reason: ${status}.`;
          if (status === "ZERO_RESULTS") {
            errorReportP.textContent += " The reverse geocode was successful but there are no results to show. Currency" +
            " used in Kosovo is the Euro; in Western Sahara several currencies are used: Moroccan Dirham, Algerian" +
            " Dinar and Mauritanian Ouguiya; and in Wake Island the currency used is the USD.";
          } else if (status === "OVER_QUERY_LIMIT") {
            errorReportP.textContent += " Developer's Google account has reached available number of queries allowed." +
            " Sorry.";
          } else if (status === "REQUEST_DENIED") {
            errorReportP.textContent += " Request to Geocoding Servece was denied.";
          } else if (status === "INVALID_REQUEST") {
            errorReportP.textContent += " Query to Geocoding Service is missing (generally, this is what this means).";
          } else if (status === "UNKNOWN_ERROR") {
            errorReportP.textContent += " Request to Geocoding Service could not be processed to a problem with their" +
           " server. It may succeed if we try again at a later time.";
          } else if (status === "ERROR") {
            errorReportP.textContent += " Request to Geocoding Service timed out or there was a problem with Google's" +
           " servers. It may succeed if we try again at a later time.";
          }
          form.append(errorReportP);
        }
        for (const option of select2.options) {
          option.selected = option.id === currencyAbbr;
        }
      });
    })
    .catch(err => {
      console.log(`Line 1226: ${err}`);
      const para = document.createElement("p");
      para.textContent =
        "Something went wrong getting the list of currencies. " +
        "(If you're a developer (for example the one who created " +
        "this application), please check the browser console).";
      form.append(para);
    });

  input2 = createInput("submit", "submit", "Convert");
  form.addEventListener("submit", onSubmit);

  form.append(para);
  form.append(input1);
  form.append(lineBr1);
  form.append(labelFrom);
  form.append(select1);
  form.append(lineBr2);
  form.append(labelTo);
  form.append(select2);
  form.append(input2);
  return form;
}

function createForm() {
  const form = document.createElement("form");
  form.method = "post";
  form.action = "https://dragonosman.dynu.net:5501/";
  return form;
}

function createInput(type, name, placeholder) {
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.placeholder = placeholder;
  return input;
}

function createSelect(name, id, value) {
  const select = document.createElement("select");
  select.name = name;
  select.id = id;
  select.value = value;
  return select;
}

function onSubmit(e) {
  e.preventDefault();
  formSubmit(e.currentTarget).then(xhr => {
    if (xhr.status >= 200 && xhr.status < 300) {
      let p = document.getElementById("conversion-result");
      if (!p) {
        p = document.createElement("p");
      }
      p.id = "conversion-result";
      const spaceIndex = xhr.responseText.indexOf(" ");
      let conversionResult = xhr.responseText.slice(0, spaceIndex);
      const currencyAbbr = xhr.responseText.slice(spaceIndex + 1);
      conversionResult = (Math.round(conversionResult * 100) / 100).toFixed(2);
      const newResultString = `${conversionResult} ${currencyAbbr}`;
      p.textContent = `${newResultString}`;
      form.append(p);
    }
  });
}

function formSubmit(form) {
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function onLoad() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr);
      } else {
        reject(xhr);
      }
    };

    xhr.onerror = function onError() {
      reject(xhr);
    };

    xhr.open(form.method, form.action, true);
    xhr.send(new FormData(form));
  });
}

window.initMap = initMap;
