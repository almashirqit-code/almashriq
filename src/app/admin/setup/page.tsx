export default function SetupPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="card p-6">
        <h1 className="mb-3 text-xl font-semibold">Al Mashriq ERP — setup required</h1>
        <p className="mb-4 text-sm text-slate-600">
          The Supabase environment variables are not configured. Add these in Vercel → Project → Settings →
          Environment Variables (or in <code>.env.local</code> for local development), then redeploy:
        </p>
        <pre className="rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {`NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}
        </pre>
        <p className="mt-4 text-sm text-slate-600">
          Then run <code>supabase/migrations/0001_init.sql</code> in the Supabase SQL editor. See README.md.
        </p>
      </div>
    </main>
  );
}
