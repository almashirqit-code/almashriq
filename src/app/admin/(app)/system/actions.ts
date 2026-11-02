"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { assertRole } from "@/lib/auth";

/** Admin → System → "Clear website cache": every public page and cached query is rebuilt on its next visit. */
export async function clearSiteCache() {
  await assertRole(["admin"]);
  revalidateTag("public-site");
  revalidatePath("/", "layout");
  return { at: new Date().toISOString() };
}
