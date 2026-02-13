import React, { useState, useEffect, useMemo } from 'react';
import { HistoryEntry, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea } from 'recharts';
import { FileDown, Activity, Clock, Syringe, Info, ArrowUp, ArrowDown } from 'lucide-react';

interface HistoryProps {
  history: HistoryEntry[];
  settings: UserSettings;
}

const INSULIN_DURATION_MINUTES = 240;
const AGP_COLORS = {
  LOW: '#ef4444',
  TARGET: '#10b981',
  YELLOW: '#facc15',
  ORANGE: '#f97316',
  BG_TARGET_AREA: '#abe7b2',
  TARGET_BG_OPACITY: 0.15,
  IOB_CURVE: '#93BFC7'
};

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
      data.push({
        time: timeAtPoint.getTime(),
        displayTime: timeAtPoint.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(totalActive.toFixed(2)),
        isFuture: offset > 0
      });
    }
    return data;
  }, [history, now]);

  const currentIOB = iobData.find(d => !d.isFuture && Math.abs(now.getTime() - d.time) < 15 * 60000)?.value || 0;

  const myDayData = useMemo(() => {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    return history
      .filter(e => {
        const t = new Date(e.timestamp).getTime();
        return t >= startOfDay && t <= endOfDay && e.glucose > 0;
      })
      .map(e => ({
        time: new Date(e.timestamp).getTime(),
        displayTime: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        glucose: e.glucose
      }));
  }, [history, now]);

  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || typeof payload.glucose === 'undefined') return null;
    const val = payload.glucose;
    let color = AGP_COLORS.TARGET;
    if (val < 80 || val > 260) color = AGP_COLORS.LOW;
    else if (val > 170 && val <= 210) color = AGP_COLORS.YELLOW;
    else if (val > 210 && val <= 260) color = AGP_COLORS.ORANGE;
    return <circle cx={cx} cy={cy} r={6} fill={color} stroke={isDark ? '#1e293b' : '#ffffff'} strokeWidth={2} className="drop-shadow-sm" />;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="p-6 pb-32 flex flex-col gap-8">
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

        {/* GRAFICO IOB */}
        <section className={`rounded-[2.5rem] p-6 shadow-soft border relative overflow-hidden transition-colors ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-white/60'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Syringe size={14} /></div>
                <h3 className="text-[10px] font-bold text-textMuted uppercase">{t.activeInsulin}</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-extrabold tracking-tighter ${isDark ? 'text-white' : 'text-textMain'}`}>{currentIOB.toFixed(1)}</span>
                <span className="text-xs text-textMuted font-bold uppercase">{t.units}</span>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm ${isDark ? 'bg-gray-700' : 'bg-appBg'}`}>
              <Clock size={12} className="text-primary" />
              <span className={`text-[9px] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="h-32 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={iobData}>
                <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} hide />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={({ active, payload }) => active && payload && payload.length ? (<div className={`px-3 py-2 rounded-xl text-[10px] shadow-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-textMain text-white'}`}><p className="font-bold opacity-60">{payload[0].payload.displayTime}</p><p className="text-sm font-extrabold">{payload[0].payload.value} U</p></div>) : null} />
                <ReferenceLine x={now.getTime()} stroke={isDark ? '#6B7280' : '#9CA3AF'} strokeDasharray="4 4" strokeWidth={2} />
                <Area type="monotone" dataKey="value" stroke={AGP_COLORS.IOB_CURVE} strokeWidth={2.5} fill={AGP_COLORS.IOB_CURVE} fillOpacity={0.2} animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* GRAFICO GLUCOSIO */}
        <section className={`rounded-[2.5rem] p-6 shadow-soft border transition-colors ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-white/60'}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-secondary/20 rounded-lg text-secondary"><Activity size={16} /></div>
                <h3 className="text-xs font-bold text-textMuted uppercase">{t.glucoseTrend}</h3>
              </div>
              <h4 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{t.myDay}</h4>
            </div>
          </div>
          <div className="h-64 -mx-2 relative">
            {myDayData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={myDayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />
                  <XAxis dataKey="time" type="number" scale="time" domain={[new Date(now).setHours(0, 0, 0, 0), new Date(now).setHours(23, 59, 59, 999)]} tickFormatter={(unix) => new Date(unix).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 300]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  {/* @ts-ignore */}
                  <ReferenceArea y1={70} y2={180} fill={AGP_COLORS.BG_TARGET_AREA} fillOpacity={AGP_COLORS.TARGET_BG_OPACITY} />
                  <ReferenceLine y={settings.targetBg} stroke={isDark ? '#475569' : '#e2e8f0'} strokeWidth={1} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="glucose" stroke="none" dot={<CustomizedDot />} activeDot={{ r: 9, stroke: isDark ? '#fff' : '#000', strokeWidth: 2 }} animationDuration={1500} />
                  <Tooltip content={({ active, payload }) => active && payload && payload.length ? (<div className={`px-4 py-3 rounded-2xl shadow-2xl border ${isDark ? 'bg-gray-800 border-white/10 text-white' : 'bg-white border-gray-100 text-textMain'}`}><p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">{payload[0].payload.displayTime}</p><p className="text-xl font-black">{payload[0].payload.glucose} <span className="text-xs font-bold text-textMuted">mg/dL</span></p></div>) : null} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-gray-800' : 'bg-appBg'}`}><Activity size={32} className="text-textMuted opacity-30" /></div>
                <p className={`text-sm font-bold ${isDark ? 'text-gray-500' : 'text-textMuted'}`}>Nessun dato glicemico per oggi.</p>
                <p className="text-[10px] uppercase font-black text-primary mt-1">Inserisci una misurazione nella Home</p>
              </div>
            )}
          </div>
        </section>

        {/* --- STORICO DETTAGLIATO (NUOVO) --- */}
        <section>
          <h3 className={`text-lg font-extrabold mb-4 px-2 ${isDark ? 'text-white' : 'text-textMain'}`}>Diario Boli</h3>
          <div className="flex flex-col gap-3">
            {history.length === 0 && <p className="text-center text-textMuted text-xs py-4">Nessun bolo registrato.</p>}
            {history.map((entry) => (
              <div key={entry.id} className={`p-4 rounded-[1.5rem] flex items-center justify-between border transition-all ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${entry.glucose > 180 ? 'bg-orange-100 text-orange-600' : (entry.glucose < 70 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}`}>
                    {entry.glucose}
                  </div>
                  <div>
                    <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{formatDate(entry.timestamp)}</p>
                    <p className="text-[10px] font-bold text-textMuted">{entry.carbs}g Carbo • {entry.mealType}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {/* Dose Fatta */}
                  <p className="text-lg font-black text-primary">{entry.units} U</p>

                  {/* Dose Consigliata (Se diversa) */}
                  {entry.recommendedUnits !== undefined && entry.recommendedUnits !== entry.units && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold text-textMuted uppercase tracking-wider">Cons. {entry.recommendedUnits} U</span>
                      {entry.units > entry.recommendedUnits ? (
                        <ArrowUp size={12} className="text-red-400" strokeWidth={3} />
                      ) : (
                        <ArrowDown size={12} className="text-green-400" strokeWidth={3} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={`no-print p-4 rounded-3xl border border-dashed mx-2 flex gap-3 items-start ${isDark ? 'bg-gray-800/30 border-primary/20' : 'bg-appBg/50 border-primary/30'}`}>
          <Info size={16} className="text-primary shrink-0 mt-0.5" />
          <p className={`text-[10px] leading-relaxed font-medium ${isDark ? 'text-gray-400' : 'text-textMuted'}`}>
            I pallini cambiano colore in base al livello: Rosso (critico), Giallo/Arancio (alto), Verde (in target).
            La linea tratteggiata indica il tuo target glicemico ideale ({settings.targetBg} mg/dL).
          </p>
        </div>
      </div>
    </div>
  );
};