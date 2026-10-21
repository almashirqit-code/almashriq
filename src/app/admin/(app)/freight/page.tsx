import { redirect } from "next/navigation";

/** Freight rates now live under Configuration. */
export default function FreightRedirect() {
  redirect("/admin/settings?tab=freight");
}
