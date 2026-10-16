"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiRequestError, importProducts } from "@/lib/api/client";
import type { ImportResult } from "@/lib/api/types";
import { useAdminSession } from "@/features/admin/AdminSessionProvider";

export default function AdminImportPage() {
  const { session, handleProtectedError } = useAdminSession();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.authenticated || !file || pending) return;
    setPending(true); setError(""); setResult(null);
    try { setResult((await importProducts(file, session.csrf_token)).data); }
    catch (reason) {
      if (reason instanceof ApiRequestError && ["CSV_HEADER_INVALID", "CSV_EMPTY"].includes(reason.code)) setError(`File could not be imported: ${reason.message}`);
      else if (reason instanceof ApiRequestError && reason.status === 413) setError("The CSV exceeds the 2 MiB limit. Choose a smaller file.");
      else if (reason instanceof ApiRequestError && reason.status === 415) setError("Choose a UTF-8 .csv file and try again.");
      else setError(await handleProtectedError(reason));
    } finally { setPending(false); }
  }

  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
    <Link className="link link-primary text-sm" href="/admin/products">← Admin products</Link>
    <h1 className="editorial mt-5 text-4xl font-semibold">Import products</h1>
    <p className="mt-3 max-w-2xl text-base-content/70">Upload a CSV with name, sku, description, category, price, stock, and weight_kg columns. Existing SKUs are skipped; each row is checked by the server.</p>
    <form className="mt-7 rounded-box border border-base-300 bg-base-100 p-5 sm:p-8" onSubmit={submit}>
      <label className="flex flex-col gap-2 font-semibold" htmlFor="csv-file">CSV file</label>
      <input id="csv-file" className="file-input file-input-bordered w-full max-w-lg" type="file" accept=".csv,text/csv" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <p className="mt-2 text-xs text-base-content/70">Maximum 2 MiB. Only one file can be uploaded at a time.</p>
      {error && <p className="alert alert-error mt-5" role="alert">{error}</p>}
      <button className="btn btn-primary mt-6" type="submit" disabled={pending || !file}>{pending ? "Importing…" : "Import CSV"}</button>
    </form>
    {result && <section className="mt-9" aria-labelledby="import-results"><h2 id="import-results" className="editorial text-2xl font-semibold">Import report</h2><div className="mt-5 grid gap-3 sm:grid-cols-4">{([ ["Total rows", result.total_rows], ["Inserted", result.inserted], ["Skipped", result.skipped], ["Rejected", result.rejected] ] as const).map(([label, count]) => <div className="rounded-box border border-base-300 bg-base-100 p-5" key={label}><p className="text-sm text-base-content/70">{label}</p><p className="mt-2 text-2xl font-bold">{count}</p></div>)}</div>
      {(result.skipped > 0 || result.rejected > 0) && <p className="alert alert-warning mt-5" role="status">Import completed with skipped or rejected rows. Review the issues below.</p>}
      {result.truncated && <p className="alert alert-warning mt-5" role="alert">Only the first 200 issues are displayed.</p>}
      {result.issues.length > 0 ? <div className="mt-5 overflow-x-auto rounded-box border border-base-300 bg-base-100"><table className="table"><thead><tr><th>Row</th><th>Field</th><th>Code</th><th>Message</th></tr></thead><tbody>{result.issues.map((issue, index) => <tr key={`${issue.row}-${issue.field}-${index}`}><td>{issue.row}</td><td>{issue.field}</td><td className="font-mono text-xs">{issue.code}</td><td>{issue.message}</td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-base-content/70">No row issues reported.</p>}
      <Link className="btn btn-outline mt-6" href="/admin/products">View products</Link>
    </section>}
  </div>;
}
