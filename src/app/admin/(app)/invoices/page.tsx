import { DocList, type DocListParams } from "./doc-list";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<DocListParams> }) {
  return <DocList docType="invoice" sp={await searchParams} />;
}
