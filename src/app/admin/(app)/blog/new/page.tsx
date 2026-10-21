import { Newspaper } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PostEditor } from "../post-editor";

export default async function NewPost() {
  await requireRole(["admin", "manager"]);
  return (
    <>
      <PageHeader icon={<Newspaper />} tone="sky" title="New post" back={{ href: "/admin/blog", label: "Blog" }} />
      <PostEditor />
    </>
  );
}
