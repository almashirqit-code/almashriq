/**
 * Simple side-view silhouettes for vehicle body types (original artwork, 64×32 viewBox).
 * Filled with currentColor; windows and wheel hubs are white.
 */
type Shape = { body: string[]; windows?: string[]; wheels: number[]; r?: number };

const S: Record<string, Shape> = {
  sedan: {
    body: ["M3 23 V18.5 Q3 16.5 6 16 L18 14.5 L25 8.5 Q26.5 7.5 29 7.5 H40 Q42.5 7.5 44.5 9.5 L49.5 14.5 L58 15.5 Q61 16 61 19 V23 Z"],
    windows: ["M27 10 H33 V14.5 H21.5 Z", "M35 10 H40 Q41.5 10 42.5 11 L46 14.5 H35 Z"],
    wheels: [15, 50],
  },
  hatchback: {
    body: ["M4 23 V18 Q4 16 7 15.5 L17 14 L24 8 Q25.5 7 28 7 H46 Q49 7 50.5 9.5 L55 16 Q58 16.5 59 18.5 V23 Z"],
    windows: ["M26.5 9.5 H34 V14 H21 Z", "M36 9.5 H46 Q47.5 9.5 48.3 11 L50 14 H36 Z"],
    wheels: [15, 48],
  },
  wagon: {
    body: ["M3 23 V18 Q3 16 6 15.5 L17 14 L23 8 Q24.5 7 27 7 H56 Q59 7 59.5 10 L61 17 V23 Z"],
    windows: ["M25.5 9.5 H33 V14 H20 Z", "M35 9.5 H45 V14 H35 Z", "M47 9.5 H56.5 L57.5 14 H47 Z"],
    wheels: [14, 50],
  },
  suv: {
    body: ["M3 23 V16 Q3 14 6 13.5 L15 12.5 L21 6 Q22.5 4.5 25 4.5 H55 Q58.5 4.5 59 8 L61 15 V23 Z"],
    windows: ["M23.5 7 H33 V12 H18.5 Z", "M35 7 H45 V12 H35 Z", "M47 7 H55.5 L56.5 12 H47 Z"],
    wheels: [15, 50],
    r: 5.5,
  },
  minivan: {
    body: ["M3 23 V15 Q3 13 5 12.5 L13 11 L22 4.5 Q23.5 3.5 26 3.5 H56 Q60 3.5 60.5 7 L61.5 15 V23 Z"],
    windows: ["M24 6 H33 V11 H16 Z", "M35 6 H45 V11 H35 Z", "M47 6 H57 L57.5 11 H47 Z"],
    wheels: [14, 51],
  },
  van: {
    body: ["M3 23 V12 Q3 9 5 7 L9 3.5 Q10.5 2.5 13 2.5 H59 Q61 2.5 61 4.5 V23 Z"],
    windows: ["M7 9 L11 5 H17 V11 H6 Z", "M20 5 H30 V11 H20 Z"],
    wheels: [14, 51],
  },
  minibus: {
    body: ["M3 23 V12 Q3 9 5 7 L9 3.5 Q10.5 2.5 13 2.5 H59 Q61 2.5 61 4.5 V23 Z"],
    windows: ["M7 9 L11 5 H17 V11 H6 Z", "M20 5 H29 V11 H20 Z", "M31 5 H40 V11 H31 Z", "M42 5 H51 V11 H42 Z", "M53 5 H59 V11 H53 Z"],
    wheels: [14, 51],
  },
  bus: {
    body: ["M2 23 V5.5 Q2 2.5 5 2.5 H60 Q62 2.5 62 5 V23 Z"],
    windows: ["M5 5.5 H11 V14 H5 Z", "M14 5.5 H22 V12 H14 Z", "M24 5.5 H32 V12 H24 Z", "M34 5.5 H42 V12 H34 Z", "M44 5.5 H52 V12 H44 Z", "M54 5.5 H59.5 V12 H54 Z"],
    wheels: [13, 51],
  },
  truck: {
    body: ["M3 23 V12 Q3 10 4.5 9 L8 4 Q9 3 11 3 H20 V23 Z", "M22 1.5 H61.5 V20.5 H22 Z", "M3 20.5 H61.5 V23 H3 Z"],
    windows: ["M6.5 10 L10 5.5 H17 V10 Z"],
    wheels: [12, 41, 52],
  },
  pickup: {
    body: ["M3 23 V16 Q3 14 6 13.5 L13 12.5 L19 6 Q20.5 5 23 5 H34 Q35.5 5 35.5 7 V14 H61 V23 Z"],
    windows: ["M21.5 7.5 H27 V12 H16.5 Z", "M29 7.5 H33 V12 H29 Z"],
    wheels: [14, 50],
  },
  coupe: {
    body: ["M3 23 V19 Q3 17 6 16.5 L20 15 L28 9.5 Q30 8.5 33 8.5 H41 Q44 8.5 46 10.5 L50 15 L58 16 Q61 16.5 61 19.5 V23 Z"],
    windows: ["M30 11 H42 Q43.5 11 44.5 12 L47 15 H24.5 Z"],
    wheels: [15, 50],
  },
  convertible: {
    body: ["M3 23 V18.5 Q3 16.5 6 16 L58 15.5 Q61 16 61 19 V23 Z", "M23 16 L27.5 10 H29.5 L25.5 16 Z"],
    wheels: [15, 50],
  },
  kei: {
    body: ["M8 23 V14 Q8 12 10 11.5 L14 10.5 L19 4.5 Q20 3.5 22 3.5 H48 Q51 3.5 51.5 6 L54 14 V23 Z"],
    windows: ["M21 6 H30 V10 H15.5 Z", "M32 6 H41 V10 H32 Z", "M43 6 H49.5 L50.5 10 H43 Z"],
    wheels: [18, 45],
    r: 4.5,
  },
  forklift: {
    body: ["M4 23 V13 H10 V6 Q10 4 12 4 H24 L30 13 H40 V23 Z", "M43 1 H46.5 V23 H43 Z", "M46.5 20.5 H62 V23 H46.5 Z"],
    windows: ["M13 6.5 H22.5 L27 12.5 H13 Z"],
    wheels: [12, 33],
  },
};

const ALIAS: Record<string, string> = {
  minivehicle: "kei",
  kei: "kei",
  keicar: "kei",
  minitruck: "truck",
  lorry: "truck",
  tipper: "truck",
  dump: "truck",
  pickuptruck: "pickup",
  estate: "wagon",
  stationwagon: "wagon",
  mpv: "minivan",
  crossover: "suv",
  "4wd": "suv",
  cabriolet: "convertible",
  roadster: "convertible",
  sports: "coupe",
};

export function bodyShapeKey(type: string) {
  const k = type.toLowerCase().replace(/[^a-z0-9]/g, "");
  return S[k] ? k : ALIAS[k] ?? (Object.keys(S).find((s) => k.includes(s)) || "sedan");
}

export function BodyIcon({ type, className = "h-8 w-16" }: { type: string; className?: string }) {
  const s = S[bodyShapeKey(type)];
  const r = s.r ?? 5;
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden fill="currentColor">
      {s.body.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {s.windows?.map((d, i) => (
        <path key={`w${i}`} d={d} fill="#fff" opacity={0.85} />
      ))}
      {s.wheels.map((x) => (
        <g key={x}>
          <circle cx={x} cy={24.5} r={r} stroke="#fff" strokeWidth={1.6} />
          <circle cx={x} cy={24.5} r={r * 0.38} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}
