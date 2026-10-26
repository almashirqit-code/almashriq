import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalMe } from "@/lib/portal";
import { AvatarPicker } from "@/components/avatar-picker";
import { ProfileForm, ChangePasswordForm } from "../../forms";
import { Card, SectionTitle } from "../ui";

export const metadata: Metadata = { title: "My profile", robots: { index: false, follow: false } };

/** The customer's own picture, contact details and password (pending accounts too). */
export default async function AccountProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = await getPortalMe();
  if (!user || !me || me.status === "rejected") redirect("/account");
  const name = me.full_name || me.email;

  return (
    <div className="max-w-3xl">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <AvatarPicker userId={user.id} name={name} current={me.avatar_url} size="h-20 w-20" folder="portal-avatars" rpc="set_my_portal_avatar" />
          <div className="min-w-0">
            <div className="truncate text-lg font-black">{name}</div>
            <div className="truncate text-sm text-white/70">{me.email}</div>
            <div className="mt-1 text-xs text-white/60">Tap the picture to upload a photo or choose an avatar.</div>
          </div>
        </div>
      </Card>

      <SectionTitle title="Your details" />
      <Card>
        <ProfileForm me={me} linked={me.status === "active"} />
      </Card>

      <SectionTitle title="Password" />
      <Card>
        <p className="mb-3 text-sm text-white/70">Your sign-in email is {me.email}. To change the email, ask your agent in Support chat.</p>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
