import { NextResponse } from "next/server";
import { getPrivateFile, readSignedFile } from "@/lib/private-files";

/** Serves a private document through a short-lived signed link made by signPrivateFile(). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const grant = readSignedFile(token);
  if (!grant) return NextResponse.json({ error: "This link has expired. Open the document again." }, { status: 403 });
  const obj = await getPrivateFile(grant.b, grant.p);
  if (!obj) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const name = (grant.n ?? "").replace(/[\r\n"]/g, "");
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": name ? `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}` : "inline",
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
