import { StockList, type StockSearch } from "./stock-list";

export default async function StockPage({ searchParams }: { searchParams: Promise<StockSearch> }) {
  return <StockList sp={await searchParams} scope="own" />;
}
