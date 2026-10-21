import type { Currency } from "./types";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

function chunk(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

export function integerToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";
  const out: string[] = [];
  let i = 0;
  while (n > 0 && i < SCALES.length) {
    const c = n % 1000;
    if (c) out.unshift(`${chunk(c)}${SCALES[i] ? " " + SCALES[i] : ""}`);
    n = Math.floor(n / 1000);
    i++;
  }
  return out.join(" ");
}

const NAMES: Record<Currency, { major: string; minor: string | null }> = {
  USD: { major: "US Dollars", minor: "Cents" },
  EUR: { major: "Euros", minor: "Cents" },
  GBP: { major: "Pounds Sterling", minor: "Pence" },
  JPY: { major: "Japanese Yen", minor: null },
  SGD: { major: "Singapore Dollars", minor: "Cents" },
  TWD: { major: "New Taiwan Dollars", minor: null },
  THB: { major: "Thai Baht", minor: "Satang" },
};

/** e.g. 14200.5 USD → "US Dollars Fourteen Thousand Two Hundred and Fifty Cents Only" */
export function amountInWords(amount: number, currency: Currency): string {
  const { major, minor } = NAMES[currency];
  const whole = Math.floor(Math.abs(amount));
  const cents = minor ? Math.round((Math.abs(amount) - whole) * 100) : 0;
  let s = `${major} ${integerToWords(whole)}`;
  if (cents > 0 && minor) s += ` and ${integerToWords(cents)} ${minor}`;
  return `${s} Only`;
}
