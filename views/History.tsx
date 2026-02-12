
import React, { useState, useEffect, useMemo } from 'react';
import { HistoryEntry, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea } from 'recharts';
import { FileDown, Activity, Clock, Syringe, Info } from 'lucide-react';

interface HistoryProps {
  history: HistoryEntry[];
  settings: UserSettings;
}

const INSULIN_DURATION_MINUTES = 240;
const AGP_COLORS = { LOW: '#ef4444', TARGET: '#abe7b2', HIGH: '#fbbf24', TARGET_BG_OPACITY: 0.15, IOB_CURVE: '#93BFC7' };

export const HistoryView: React.FC<HistoryProps> = ({ history, settings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const iobData = useMemo(() => {
    const data = [];
    for (let offset = -60; offset <= INSULIN_DURATION_MINUTES; offset += 15) {
      const timeAtPoint = new Date(now.getTime() + offset * 60000);
      let totalActive = 0;
      history.forEach(entry => {
        if (entry.type === 'bolus') {
          const minutesSinceInjection = (timeAtPoint.getTime() - new Date(entry.timestamp).getTime()) / 60000;
          if (minutesSinceInjection >= 0 && minutesSinceInjection < INSULIN_DURATION_MINUTES) {
            const progress = minutesSinceInjection / INSULIN_DURATION_MINUTES;
            const remainingFactor = Math.pow(1 - progress, 2);
            totalActive += entry.units * remainingFactor;
          }
        }
      });
      data.push({ time: timeAtPoint.getTime(), displayTime: timeAtPoint.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: parseFloat(totalActive.toFixed(2)), isFuture: offset > 0 });
    }
    return data;
  }, [history, now]);

  const currentIOB = iobData.find(d => !d.isFuture && Math.abs(now.getTime() - d.time) < 15 * 60000)?.value || 0;

  const myDayData = useMemo(() => {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    return history
      .filter(e => { const t = new Date(e.timestamp).getTime(); return t >= startOfDay && t <= endOfDay && e.glucose > 0; })
      .map(e => ({ time: new Date(e.timestamp).getTime(), displayTime: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), glucose: e.glucose }));
  }, [history, now]);

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="pt-2 flex justify-between items-center no-print">
        <div>
          <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{t.monitoring}</h2>
          <p className="text-textMuted text-xs font-bold uppercase tracking-widest">Dati AGP</p>
        </div>
        <button onClick={() => window.print()} className={`p-3 rounded-2xl shadow-sm transition-all flex items-center gap-2 border ${isDark ? 'bg-gray-800 border-white/5 text-white' : 'bg-white border-gray-100 text-textMain'}`}>
          <FileDown size={18} />
          <span className="text-xs font-bold">{t.export}</span>
        </button>
      </header>

      <section className={`rounded-[2.5rem] p-6 shadow-soft border relative overflow-hidden transition-colors ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-white/60'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1"><div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Syringe size={14} /></div><h3 className="text-[10px] font-bold text-textMuted uppercase">{t.activeInsulin}</h3></div>
            <div className="flex items-baseline gap-1"><span className={`text-3xl font-extrabold tracking-tighter ${isDark ? 'text-white' : 'text-textMain'}`}>{currentIOB.toFixed(1)}</span><span className="text-xs text-textMuted font-bold uppercase">{t.units}</span></div>
          </div>
          <div className="bg-appBg px-2.5 py-1 rounded-xl flex items-center gap-1.5"><Clock size={12} className="text-primary" /><span className="text-[9px] font-bold text-gray-900">{now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
        </div>
        <div className="h-28 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={iobData}>
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip content={({ active, payload }) => active && payload && (
                  <div className="bg-textMain text-white px-3 py-2 rounded-xl text-[10px]"><p className="font-bold opacity-60">{payload[0].payload.displayTime}</p><p className="text-sm font-extrabold">{payload[0].payload.value} U</p></div>
                )} />
              <Area type="monotone" dataKey="value" stroke={AGP_COLORS.IOB_CURVE} strokeWidth={2.5} fill={AGP_COLORS.IOB_CURVE} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={`rounded-[2.5rem] p-6 shadow-soft border transition-colors ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-white/60'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col"><div className="flex items-center gap-2 mb-1"><div className="p-1.5 bg-secondary/20 rounded-lg text-secondary"><Activity size={16} /></div><h3 className="text-xs font-bold text-textMuted uppercase">{t.glucoseTrend}</h3></div><h4 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{t.myDay}</h4></div>
        </div>
        <div className="h-56 -mx-2 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={myDayData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
              <XAxis dataKey="time" type="number" scale="time" domain={[new Date(now).setHours(0,0,0,0), new Date(now).setHours(23,59,59,999)]} tickFormatter={(unix) => new Date(unix).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} tick={{fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 300]} tick={{fontSize: 10, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
              <ReferenceArea y1={70} y2={180} fill={AGP_COLORS.TARGET} fillOpacity={AGP_COLORS.TARGET_BG_OPACITY} />
              <Line type="monotone" dataKey="glucose" stroke={isDark ? '#cbd5e1' : '#1F2937'} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
