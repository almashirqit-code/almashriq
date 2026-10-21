import { DocList, type DocListParams } from "../doc-list";

export const metadata = { title: "Quotations" };

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<DocListParams> }) {
  return <DocList docType="quotation" sp={await searchParams} />;
}
