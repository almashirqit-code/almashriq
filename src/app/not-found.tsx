import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-5xl font-bold text-slate-300">404</div>
      <p className="text-slate-600">Page not found · ページが見つかりません</p>
      <Link href="/" className="btn-primary">
        Dashboard
      </Link>
    </main>
  );
}
