// رسم أعمدة بسيط (SVG) لإيرادات ومصروفات آخر ستة أشهر — بدون أي مكتبات خارجية
export type MonthPoint = {
  label: string; // "01/26"
  income: number;
  expense: number;
};

export function MonthlyChart({ data, currency }: { data: MonthPoint[]; currency: string }) {
  const W = 640;
  const H = 220;
  const PAD_X = 8;
  const PAD_BOTTOM = 26;
  const PAD_TOP = 18;
  const chartH = H - PAD_BOTTOM - PAD_TOP;

  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupW = (W - PAD_X * 2) / data.length;
  const barW = Math.min(26, groupW / 3);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}م` : n >= 1000 ? `${(n / 1000).toFixed(0)}ك` : String(Math.round(n));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="إيرادات ومصروفات آخر ستة أشهر">
      {/* خطوط إرشادية */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_TOP + chartH * (1 - f)}
          y2={PAD_TOP + chartH * (1 - f)}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}

      {data.map((d, i) => {
        const cx = PAD_X + groupW * i + groupW / 2;
        const incomeH = (d.income / max) * chartH;
        const expenseH = (d.expense / max) * chartH;
        return (
          <g key={d.label}>
            <rect
              x={cx - barW - 2}
              y={PAD_TOP + chartH - incomeH}
              width={barW}
              height={Math.max(incomeH, d.income > 0 ? 2 : 0)}
              rx={3}
              fill="#059669"
            />
            <rect
              x={cx + 2}
              y={PAD_TOP + chartH - expenseH}
              width={barW}
              height={Math.max(expenseH, d.expense > 0 ? 2 : 0)}
              rx={3}
              fill="#dc2626"
            />
            {d.income > 0 && (
              <text x={cx - barW / 2 - 2} y={PAD_TOP + chartH - incomeH - 4} textAnchor="middle" fontSize={9} fill="#065f46">
                {fmt(d.income)}
              </text>
            )}
            {d.expense > 0 && (
              <text x={cx + barW / 2 + 2} y={PAD_TOP + chartH - expenseH - 4} textAnchor="middle" fontSize={9} fill="#991b1b">
                {fmt(d.expense)}
              </text>
            )}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="#64748b">
              {d.label}
            </text>
          </g>
        );
      })}

      {/* مفتاح الألوان */}
      <g fontSize={10} fill="#475569">
        <rect x={PAD_X} y={2} width={10} height={10} rx={2} fill="#059669" />
        <text x={PAD_X + 14} y={11}>الإيرادات ({currency})</text>
        <rect x={PAD_X + 110} y={2} width={10} height={10} rx={2} fill="#dc2626" />
        <text x={PAD_X + 124} y={11}>المصروفات</text>
      </g>
    </svg>
  );
}
