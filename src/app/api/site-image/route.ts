import { NextResponse, type NextRequest } from "next/server";
import { assertRole } from "@/lib/auth";
import { siteFetch } from "@/lib/site-import/fetch";

export const maxDuration = 60;

/** Image proxy for the website importer (staff only, old website only) so the browser can compress photos. */
export async function GET(req: NextRequest) {
  try {
    await assertRole(["admin", "manager"]);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = req.nextUrl.searchParams.get("u") ?? "";
  try {
    const res = await siteFetch(url);
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return NextResponse.json({ error: "not an image" }, { status: 400 });
    return new NextResponse(await res.arrayBuffer(), { headers: { "content-type": type, "cache-control": "private, max-age=600" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
