/**
 * Popular models with their own landing page (/models/<slug>), targeting searches such as
 * "used Toyota Corolla Fielder for sale Japan". Picked from the models we stock most.
 * `q` is matched against stock no., make, model and grade (public_vehicles p_q, case-insensitive).
 */
export type PopularModel = { slug: string; make: string; model: string; q: string; blurb: string };

export const POPULAR_MODELS: PopularModel[] = [
  {
    slug: "toyota-corolla-fielder",
    make: "Toyota",
    model: "Corolla Fielder",
    // Also matches stock entered as "COROLLA FILEDER".
    q: "COROLLA FI",
    blurb: "The Corolla Fielder is Japan's favourite compact station wagon: roomy, economical and famously reliable, including hybrid versions.",
  },
  { slug: "honda-fit", make: "Honda", model: "Fit", q: "FIT", blurb: "The Honda Fit (Jazz) is a compact hatchback with a surprisingly large, flexible cabin and excellent fuel economy, including hybrid models." },
  { slug: "toyota-allion", make: "Toyota", model: "Allion", q: "ALLION", blurb: "The Toyota Allion is a comfortable, dependable mid-size sedan — a popular family and taxi car in many export markets." },
  { slug: "honda-vezel", make: "Honda", model: "Vezel", q: "VEZEL", blurb: "The Honda Vezel (HR-V) is a stylish compact SUV, widely available as a fuel-saving hybrid." },
  { slug: "honda-cr-v", make: "Honda", model: "CR-V", q: "CR-V", blurb: "The Honda CR-V is a practical, well-built SUV with plenty of space for families and luggage." },
  { slug: "toyota-vitz", make: "Toyota", model: "Vitz", q: "VITZ", blurb: "The Toyota Vitz (Yaris) is an easy-to-drive, low-cost city car that is cheap to run and maintain." },
  { slug: "toyota-premio", make: "Toyota", model: "Premio", q: "PREMIO", blurb: "The Toyota Premio is the Allion's more upmarket twin: a refined, reliable sedan with a smooth ride." },
  { slug: "toyota-velfire", make: "Toyota", model: "Velfire", q: "VELFIRE", blurb: "The Toyota Velfire is a luxury people carrier with seating for seven or eight, and a favourite JDM import." },
  { slug: "toyota-hiace", make: "Toyota", model: "HiAce", q: "HIACE", blurb: "The Toyota HiAce van is the workhorse of business fleets worldwide — tough, spacious and easy to repair." },
  { slug: "mazda-axela", make: "Mazda", model: "Axela", q: "AXELA", blurb: "The Mazda Axela (Mazda3) is a sporty, well-equipped hatchback and sedan with a quality interior." },
];

export const modelBySlug = (slug: string) => POPULAR_MODELS.find((m) => m.slug === slug) ?? null;
