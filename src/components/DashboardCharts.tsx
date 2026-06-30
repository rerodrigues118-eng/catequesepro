import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface NivelChartItem {
  name: string;
  value: number;
  fill: string;
}

interface ComunidadeChartItem {
  nome: string;
  n: number;
}

interface HistoricoChartItem {
  data: string;
  presentes: number;
  faltas: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{label}</div>
      {payload.map((item, index) => (
        <div key={`${item.name ?? "serie"}-${index}`} style={{ color: item.color ?? "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: item.color ?? "#1e40af", display: "inline-block" }} />
          <span>{item.name}</span>
          <span style={{ marginLeft: 6, fontWeight: 600 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function NivelPieChart({ data }: { data: NivelChartItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={28} outerRadius={50} strokeWidth={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ComunidadeBarChart({ data }: { data: ComunidadeChartItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -24 }}>
        <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="n" fill="#1e40af" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistoricoBarChart({ data }: { data: HistoricoChartItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -24 }}>
        <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="presentes" name="Presentes" fill="#1e40af" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="faltas" name="Faltas" fill="#fca5a5" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
