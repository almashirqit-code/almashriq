import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile, Role } from "./types";

/** Current signed-in profile (cached per request). Redirects to /admin/login if missing. */
export const getProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data || !data.active) {
    await supabase.auth.signOut();
    redirect("/admin/login?disabled=1");
  }
  return data as Profile;
});

export async function requireRole(roles: Role[]) {
  const profile = await getProfile();
  if (!roles.includes(profile.role)) redirect("/admin");
  return profile;
}

/** For server actions: returns profile or throws instead of redirecting. */
export async function assertRole(roles: Role[]) {
  const profile = await getProfile();
  if (!roles.includes(profile.role)) throw new Error("forbidden");
  return profile;
}

export const can = {
  editStock: (r: Role) => r === "admin" || r === "manager",
  deleteStock: (r: Role) => r === "admin",
  seeCost: (r: Role) => r === "admin" || r === "manager",
  deleteRecords: (r: Role) => r === "admin" || r === "manager",
  manageUsers: (r: Role) => r === "admin",
  manageSettings: (r: Role) => r === "admin",
};
