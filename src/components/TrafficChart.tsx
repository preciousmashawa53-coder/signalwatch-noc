import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { clock } from '../lib/format';
import type { NationalPoint } from '../sim/engine';

interface Props {
  data: NationalPoint[];
}

interface TipProps {
  active?: boolean;
  payload?: { payload: NationalPoint }[];
}

function ChartTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>{clock(p.t)}</strong>
      <span>Actual {p.dataGbps.toFixed(1)} Gbps</span>
      <span>
        Normal range {p.band[0].toFixed(1)} to {p.band[1].toFixed(1)} Gbps
      </span>
    </div>
  );
}

export function TrafficChart({ data }: Props) {
  const last = data[data.length - 1];
  return (
    <section className="panel traffic" aria-labelledby="traffic-title">
      <header className="panel-head">
        <div>
          <h2 id="traffic-title">National data traffic</h2>
          <p className="panel-sub">Last 3 hours. The shaded band is the normal range the AI has learned for each minute.</p>
        </div>
        <div className="legend" aria-hidden="true">
          <span className="key key-actual">Actual</span>
          <span className="key key-band">Learned normal</span>
        </div>
      </header>
      <div className="chart-box" role="img" aria-label={`Data traffic now ${last?.dataGbps.toFixed(1)} gigabits per second`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <XAxis
              dataKey="t"
              tickFormatter={clock}
              stroke="var(--muted)"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              minTickGap={48}
            />
            <YAxis
              stroke="var(--muted)"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[(min: number) => Math.max(0, Math.floor(min * 0.7)), (max: number) => Math.ceil(max * 1.1)]}
              tickFormatter={(v: number) => `${v} G`}
            />
            <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--line-strong)' }} />
            <Area dataKey="band" stroke="none" fill="var(--ai)" fillOpacity={0.16} isAnimationActive={false} />
            <Line dataKey="expectedGbps" stroke="var(--ai)" strokeOpacity={0.55} strokeDasharray="4 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line dataKey="dataGbps" stroke="var(--up)" dot={false} strokeWidth={2.2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
