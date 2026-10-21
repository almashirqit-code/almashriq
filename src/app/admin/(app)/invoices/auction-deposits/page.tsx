import { DocList, type DocListParams } from "../doc-list";

export const metadata = { title: "Auction deposits" };

export default async function AuctionDepositsPage({ searchParams }: { searchParams: Promise<DocListParams> }) {
  return <DocList docType="auction_deposit" sp={await searchParams} />;
}
