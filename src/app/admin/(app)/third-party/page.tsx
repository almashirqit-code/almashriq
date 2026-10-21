import { StockList, type StockSearch } from "../stock/stock-list";

export const metadata = { title: "Third-party stock" };

export default async function ThirdPartyPage({ searchParams }: { searchParams: Promise<StockSearch> }) {
  return <StockList sp={await searchParams} scope="third_party" />;
}
