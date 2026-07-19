import Link from "next/link";
import { Button } from "@/components/ui";

// صندوق بحث GET بسيط يحافظ على بقية معاملات الرابط
export function SearchBox({
  q,
  placeholder = "بحث...",
  basePath,
  extraParams = {},
}: {
  q?: string;
  placeholder?: string;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <form method="get" action={basePath} className="flex items-center gap-2 mb-4 flex-wrap">
      {Object.entries(extraParams).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null
      )}
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="w-full sm:w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <Button type="submit" variant="secondary">
        بحث
      </Button>
      {q ? (
        <Link href={basePath} className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
          مسح
        </Link>
      ) : null}
    </form>
  );
}

export const PER_PAGE = 25;

export function parsePage(raw: string | string[] | undefined): number {
  const n = Number(typeof raw === "string" ? raw : "1");
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  if (page > 1) qs.set("page", String(page));
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  page,
  total,
  perPage = PER_PAGE,
  basePath,
  params = {},
}: {
  page: number;
  total: number;
  perPage?: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
      <div>
        {page > 1 ? (
          <Link
            href={buildHref(basePath, params, page - 1)}
            className="rounded-lg bg-slate-100 px-3 py-1.5 hover:bg-slate-200"
          >
            → السابق
          </Link>
        ) : (
          <span />
        )}
      </div>
      <p className="text-xs text-slate-500">
        صفحة {page} من {totalPages} ({total} سجل)
      </p>
      <div>
        {page < totalPages ? (
          <Link
            href={buildHref(basePath, params, page + 1)}
            className="rounded-lg bg-slate-100 px-3 py-1.5 hover:bg-slate-200"
          >
            التالي ←
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
