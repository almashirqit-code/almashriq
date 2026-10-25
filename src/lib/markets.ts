/**
 * Export markets with their own landing page (/export/<slug>), targeting searches such as
 * "Japanese used cars for sale in Kenya". Content sticks to stable facts (ports, driving side,
 * shipping routes). Import rules (age limits, duties, RHD bans) change often and are deliberately
 * NOT stated here — buyers are told to confirm current rules, and we check them with every quote.
 * The flag images live in public/flags/<code>.svg (same set as the home page).
 */
export type Market = {
  slug: string;
  name: string;
  /** ISO code of the bundled flag. */
  code: string;
  /** "in Kenya", "to the UK" — how the country reads inside a sentence. */
  inName: string;
  ports: string[];
  /** Side of the road traffic drives on. Japanese cars are right-hand drive. */
  drives: "left" | "right";
  shipping: string;
  intro: string;
  /** Popular body types / uses to mention, matched to what buyers there typically ask for. */
  popular: string;
  faq: { q: string; a: string }[];
};

const CONFIRM_RULES = "Import rules (vehicle age limits, duties and registration requirements) change from time to time, so please confirm the current rules with your local authority or clearing agent. We check them with you before you pay.";

export const MARKETS: Market[] = [
  {
    slug: "kenya",
    name: "Kenya",
    code: "ke",
    inName: "in Kenya",
    ports: ["Mombasa"],
    drives: "left",
    shipping: "RoRo or container to the Port of Mombasa",
    intro:
      "Kenyan buyers have trusted Japanese used cars for decades: they are right-hand drive like Kenya's roads, well maintained, and easy to service. We export directly from our yard in Ibaraki, Japan to Mombasa, with full photos, honest mileage and a clear C&F price before you pay.",
    popular: "compact cars like the Toyota Vitz and Honda Fit, family wagons like the Corolla Fielder, and SUVs for upcountry roads",
    faq: [
      { q: "How do I buy a Japanese used car and ship it to Kenya?", a: "Choose a car from our stock (or ask us to find one), send us an inquiry with \"Mombasa\" as your port, and we reply with a C&F quotation. After you pay by bank transfer we book the vessel and courier the original documents to you or your clearing agent." },
      { q: "Do you ship to Mombasa by RoRo or container?", a: "Both. RoRo is usually the most economical way to ship a single car to Mombasa; a container suits several cars or cars with parts. We quote whichever works out better for you." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "tanzania",
    name: "Tanzania",
    code: "tz",
    inName: "in Tanzania",
    ports: ["Dar es Salaam"],
    drives: "left",
    shipping: "RoRo or container to the Port of Dar es Salaam",
    intro:
      "Dar es Salaam is one of East Africa's busiest gateways for Japanese used cars, serving buyers in Tanzania and, in transit, neighbouring landlocked countries. We ship right-hand-drive Japanese cars there by RoRo and container, priced FOB or C&F to Dar es Salaam.",
    popular: "fuel-efficient sedans like the Toyota Allion and Premio, minivans for families and business, and 4x4s",
    faq: [
      { q: "Can you ship a car from Japan to Dar es Salaam?", a: "Yes. Put \"Dar es Salaam\" as the destination port in your inquiry and we will send a C&F quotation with the next available vessel." },
      { q: "Can my car continue to Zambia, Malawi or another neighbouring country?", a: "Many buyers ship to Dar es Salaam and arrange transit inland through a clearing agent. Tell us your final country and we will prepare the documents accordingly." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "ghana",
    name: "Ghana",
    code: "gh",
    inName: "in Ghana",
    ports: ["Tema"],
    drives: "right",
    shipping: "RoRo or container to the Port of Tema",
    intro:
      "We export Japanese used vehicles, spare parts and machinery to Ghana through the Port of Tema. Ghana drives on the right and Japanese cars are right-hand drive, so please check the current rules for the vehicle you want before buying — spare parts, half cuts and machinery are popular alternatives.",
    popular: "spare parts and engines, half cuts, trucks and machinery",
    faq: [
      { q: "Do you ship to Tema, Ghana?", a: "Yes, by RoRo and by container. Send an inquiry with \"Tema\" as your port for a C&F quotation." },
      { q: "Japanese cars are right-hand drive — can I import one to Ghana?", a: "Ghana drives on the right, and rules for right-hand-drive vehicles apply. Please confirm with Ghanaian authorities or your clearing agent before ordering a car; we are happy to supply parts, engines, half cuts or machinery instead." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "nigeria",
    name: "Nigeria",
    code: "ng",
    inName: "in Nigeria",
    ports: ["Lagos (Apapa / Tin Can Island)"],
    drives: "right",
    shipping: "RoRo or container to Lagos",
    intro:
      "We ship Japanese used vehicles, spare parts and machinery to Lagos, Nigeria by RoRo and container. Nigeria drives on the right, so check the current rules for right-hand-drive cars before ordering one — our parts, engines and half cuts are a popular way to keep Japanese vehicles on the road.",
    popular: "engines and spare parts, half cuts, trucks and heavy machinery",
    faq: [
      { q: "Do you ship to Lagos?", a: "Yes, to the Lagos ports (Apapa and Tin Can Island) by RoRo and container. Ask us for a C&F quotation to Lagos." },
      { q: "Can I import a right-hand-drive Japanese car to Nigeria?", a: "Nigeria drives on the right and has rules for right-hand-drive vehicles. Please confirm the current position with your clearing agent before ordering a car. Parts, engines, half cuts and machinery are not affected in the same way." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "jamaica",
    name: "Jamaica",
    code: "jm",
    inName: "in Jamaica",
    ports: ["Kingston"],
    drives: "left",
    shipping: "RoRo or container to Kingston",
    intro:
      "Jamaica drives on the left, so Japanese right-hand-drive cars fit right in. We export quality used cars from Japan to Kingston with full photos and inspection, and quote the full C&F price so you know the landed cost before you commit.",
    popular: "Toyota and Honda sedans and hatchbacks, minivans, and pickups",
    faq: [
      { q: "How long does it take to ship a car from Japan to Jamaica?", a: "It depends on the vessel schedule at the time. We include the next available sailing to Kingston in your quotation." },
      { q: "Can you find a specific car for me?", a: "Yes. Tell us the model, year, mileage and budget — we buy at Japanese auctions every day and can source a car to order." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "trinidad-and-tobago",
    name: "Trinidad and Tobago",
    code: "tt",
    inName: "in Trinidad and Tobago",
    ports: ["Port of Spain", "Point Lisas"],
    drives: "left",
    shipping: "RoRo or container to Port of Spain",
    intro:
      "Trinidad and Tobago drives on the left, making Japanese right-hand-drive cars a natural choice. We ship from Japan to Port of Spain with a clear FOB or C&F price, photos of every angle and the export documents couriered to you.",
    popular: "compact cars, family sedans and wagons, and SUVs",
    faq: [
      { q: "Do you ship to Port of Spain?", a: "Yes. Put \"Port of Spain\" (or Point Lisas) in your inquiry and we will quote C&F to that port." },
      { q: "What documents do I receive?", a: "The original Bill of Lading, export certificate and invoice, sent by courier after the car ships, so you or your broker can clear it." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "guyana",
    name: "Guyana",
    code: "gy",
    inName: "in Guyana",
    ports: ["Georgetown"],
    drives: "left",
    shipping: "container or RoRo to Georgetown",
    intro:
      "Guyana drives on the left and Japanese cars are a familiar sight on its roads. We export used cars from Japan to Georgetown and quote the full C&F price, so customers in Guyana can compare the landed cost with confidence.",
    popular: "Toyota sedans and wagons, minivans and pickups",
    faq: [
      { q: "Do you ship cars from Japan to Georgetown, Guyana?", a: "Yes. We have customers in Guyana and ship to Georgetown. Ask us for a C&F quotation with your preferred car." },
      { q: "How do I pay?", a: "By bank transfer (TT) to our company account in Japan using our proforma invoice. Please send us the remittance slip so we can confirm quickly." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "united-kingdom",
    name: "United Kingdom",
    code: "gb",
    inName: "in the UK",
    ports: ["Southampton", "Bristol (Portbury)"],
    drives: "left",
    shipping: "RoRo or container to UK ports such as Southampton",
    intro:
      "The UK drives on the left, and Japanese import (\"JDM\") cars are popular with enthusiasts and families alike — from Toyota Alphard and Velfire people carriers to compact kei and hybrid cars. We export from Japan to UK ports with photos, mileage and grades checked.",
    popular: "Toyota Alphard / Velfire, hybrids, and enthusiast JDM models",
    faq: [
      { q: "Can you ship a Japanese car to the UK?", a: "Yes, to UK ports such as Southampton or Bristol (Portbury). We quote C&F to your preferred port." },
      { q: "Do I need to register the car after it arrives?", a: "Imported cars must be registered with the DVLA, and some need extra approval first. Your importer or agent can advise; we provide the export documents you need." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "mongolia",
    name: "Mongolia",
    code: "mn",
    inName: "in Mongolia",
    ports: ["Tianjin, China (then rail/road to Ulaanbaatar)"],
    drives: "right",
    shipping: "container via China, then rail or road to Ulaanbaatar",
    intro:
      "Japanese used cars — especially hybrids — are very common in Mongolia. Because Mongolia is landlocked, cars usually travel by container to a Chinese port such as Tianjin and continue by rail or road to Ulaanbaatar. We arrange the sea leg and documents from Japan.",
    popular: "hybrids such as the Toyota Prius and Aqua, SUVs and 4x4s for winter",
    faq: [
      { q: "How do cars from Japan reach Mongolia?", a: "Usually by container to a Chinese port such as Tianjin, then by rail or road to Ulaanbaatar. We handle shipping from Japan; your forwarder handles the inland transit." },
      { q: "Do you sell hybrid cars?", a: "Yes, Japanese hybrids are a large part of our stock. Search our stock list or tell us the model you want." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
  {
    slug: "pakistan",
    name: "Pakistan",
    code: "pk",
    inName: "in Pakistan",
    ports: ["Karachi", "Port Qasim"],
    drives: "left",
    shipping: "RoRo or container to Karachi",
    intro:
      "Pakistan drives on the left and Japanese cars are hugely popular there, from kei cars and hatchbacks to SUVs. We export from Japan to Karachi with auction sheets, photos and honest mileage, and can buy at auction to your exact specification.",
    popular: "kei cars, Honda and Toyota hatchbacks, Vezel and other hybrids, and SUVs",
    faq: [
      { q: "Do you ship cars from Japan to Karachi?", a: "Yes, to Karachi and Port Qasim. Ask us for a C&F quotation to Karachi." },
      { q: "Can you provide the auction sheet?", a: "For cars bought at auction we share the auction sheet and translate the key points, so you know the grade and condition." },
      { q: "Are there import rules I should check before buying?", a: CONFIRM_RULES },
    ],
  },
];

export const marketBySlug = (slug: string) => MARKETS.find((m) => m.slug === slug) ?? null;
