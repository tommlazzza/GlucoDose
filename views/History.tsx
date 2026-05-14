import React, { useState, useEffect, useMemo } from 'react';
import { HistoryEntry, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { AreaChart, Area, ComposedChart, Line, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea } from 'recharts';
import { Activity, Clock, Syringe, ArrowUp, ArrowDown, ChevronRight, X } from 'lucide-react';

interface HistoryProps {
  history: HistoryEntry[];
  settings: UserSettings;
}

const INSULIN_DURATION_MINUTES = 240;
const AGP_COLORS = {
  LOW: '#ef4444',     // Rosso
  TARGET: '#10b981',  // Verde
  YELLOW: '#facc15',  // Giallo
  ORANGE: '#f97316',  // Arancio
  BG_TARGET_AREA: '#abe7b2',
  TARGET_BG_OPACITY: 0.15,
  IOB_CURVE: '#93BFC7',
  INSULIN_BAR: '#3b82f6' // Blu per le barre insulina
};

// --- COMPONENTE BARRA PERSONALIZZATA ---
const CustomInsulinBar = (props: any) => {
  const { x, y, width, height, fill } = props;

  if (!height || height <= 0) return null;

  const fixedWidth = 4;
  const centerX = x + width / 2;
  const newX = centerX - fixedWidth / 2;
  const radius = 2;

  const path = `
    M${newX},${y + height}
    L${newX},${y + radius}
    Q${newX},${y} ${newX + radius},${y}
    L${newX + fixedWidth - radius},${y}
    Q${newX + fixedWidth},${y} ${newX + fixedWidth},${y + radius}
    L${newX + fixedWidth},${y + height}
    Z
  `;

  return <path d={path} fill={fill} />;
};

export const HistoryView: React.FC<HistoryProps> = ({ history, settings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';
  const [now, setNow] = useState(new Date());
  const [activeTooltipIOB, setActiveTooltipIOB] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showFullMealAnalysis, setShowFullMealAnalysis] = useState(false);

  // Stato per il popup di dettaglio della fascia oraria
  const [selectedSlot, setSelectedSlot] = useState<{ date: string, label: string, entries: HistoryEntry[] } | null>(null);

  // Valori TIR personalizzati
  const minTIR = settings.minGlucoseTarget || 70;
  const maxTIR = settings.maxGlucoseTarget || 180;

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- CALCOLO IOB (Insulina Attiva) ---
  const iobData = useMemo(() => {
    const halfRange = 240;
    const data = [];

    const injectionTimes = history
      .filter(e => e.type === 'bolus')
      .map(e => new Date(e.timestamp).getTime());

    for (let offset = -halfRange; offset <= halfRange; offset += 5) {
      const timeAtPoint = new Date(now.getTime() + offset * 60000);
      const currentTime = timeAtPoint.getTime();

      let totalActive = 0;

      history.forEach(entry => {
        if (entry.type === 'bolus') {
          const minutesSinceInjection = (currentTime - new Date(entry.timestamp).getTime()) / 60000;

          if (minutesSinceInjection >= 0 && minutesSinceInjection < INSULIN_DURATION_MINUTES) {
            const progress = minutesSinceInjection / INSULIN_DURATION_MINUTES;
            const remainingFactor = Math.pow(1 - progress, 2);
            totalActive += entry.units * remainingFactor;
          }
        }
      });

      data.push({
        time: currentTime,
        displayTime: timeAtPoint.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }),
        value: parseFloat(totalActive.toFixed(2)),
        isFuture: offset > 0,
        isNow: offset === 0
      });
    }

    injectionTimes.forEach(injTime => {
      const timeRange = now.getTime();
      if (injTime >= timeRange - halfRange * 60000 && injTime <= timeRange + halfRange * 60000) {
        const beforeTime = injTime - 1000;
        let valueBefore = 0;
        history.forEach(entry => {
          if (entry.type === 'bolus') {
            const minutesSince = (beforeTime - new Date(entry.timestamp).getTime()) / 60000;
            if (minutesSince >= 0 && minutesSince < INSULIN_DURATION_MINUTES) {
              const progress = minutesSince / INSULIN_DURATION_MINUTES;
              valueBefore += entry.units * Math.pow(1 - progress, 2);
            }
          }
        });

        const afterTime = injTime + 1000;
        let valueAfter = 0;
        history.forEach(entry => {
          if (entry.type === 'bolus') {
            const minutesSince = (afterTime - new Date(entry.timestamp).getTime()) / 60000;
            if (minutesSince >= 0 && minutesSince < INSULIN_DURATION_MINUTES) {
              const progress = minutesSince / INSULIN_DURATION_MINUTES;
              valueAfter += entry.units * Math.pow(1 - progress, 2);
            }
          }
        });

        data.push({
          time: beforeTime,
          displayTime: new Date(beforeTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }),
          value: parseFloat(valueBefore.toFixed(2)),
          isFuture: beforeTime > now.getTime(),
          isNow: false
        });

        data.push({
          time: afterTime,
          displayTime: new Date(afterTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }),
          value: parseFloat(valueAfter.toFixed(2)),
          isFuture: afterTime > now.getTime(),
          isNow: false
        });
      }
    });

    return data.sort((a, b) => a.time - b.time);
  }, [history, now]);

  const currentIOB = iobData.find(d => d.isNow)?.value || 0;

  const iobTicks = useMemo(() => {
    const ticks = [];
    const nowTime = now.getTime();
    ticks.push(nowTime - 4 * 60 * 60 * 1000);
    ticks.push(nowTime - 2 * 60 * 60 * 1000);
    ticks.push(nowTime);
    ticks.push(nowTime + 2 * 60 * 60 * 1000);
    ticks.push(nowTime + 4 * 60 * 60 * 1000);
    return ticks;
  }, [now]);

  // --- DATI GRAFICO GIORNALIERO ---
  const myDayData = useMemo(() => {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const startOfDay = todayStart.getTime();

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const endOfDay = todayEnd.getTime();

    return history
      .filter(e => {
        const t = new Date(e.timestamp).getTime();
        return t >= startOfDay && t <= endOfDay && (e.glucose > 0 || e.units > 0);
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(e => ({
        time: new Date(e.timestamp).getTime(),
        displayTime: new Date(e.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }),
        glucose: e.glucose > 0 ? e.glucose : null,
        units: e.units > 0 ? e.units : null
      }));
  }, [history, now]);

  const glucoseTicks = useMemo(() => {
    const ticks = [];
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 24; i += 4) {
      ticks.push(start.getTime() + i * 3600000);
    }
    return ticks;
  }, [now]);

  const yAxisDomain = useMemo(() => {
    const glucoseValues = myDayData.map(d => d.glucose).filter(v => v !== null) as number[];

    if (glucoseValues.length === 0) {
      const tirMargin = (maxTIR - minTIR) * 0.15;
      return [
        Math.max(20, Math.floor(minTIR - tirMargin)),
        Math.min(600, Math.ceil(maxTIR + tirMargin))
      ];
    }
    const minGlucose = Math.min(...glucoseValues);
    const maxGlucose = Math.max(...glucoseValues);
    const dataMin = Math.min(minGlucose, minTIR);
    const dataMax = Math.max(maxGlucose, maxTIR);
    const range = dataMax - dataMin;
    const margin = range * 0.1;
    const yMin = Math.max(20, Math.floor(dataMin - margin));
    const yMax = Math.min(600, Math.ceil(dataMax + margin));
    return [yMin, yMax];
  }, [myDayData, minTIR, maxTIR]);

  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload || typeof payload.glucose !== 'number') return null;

    const val = payload.glucose;
    let color = AGP_COLORS.TARGET;
    if (val < minTIR) color = AGP_COLORS.LOW;
    else if (val > 250) color = AGP_COLORS.ORANGE;
    else if (val > maxTIR) color = AGP_COLORS.YELLOW;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={color}
        stroke={isDark ? '#1e293b' : '#ffffff'}
        strokeWidth={2.5}
        className="drop-shadow-sm"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const recentHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3);
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="p-6 pb-32 flex flex-col gap-8">
        <header className="pt-2 flex justify-between items-center">
          <div>
            <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{t.monitoring}</h2>
            <p className="text-textMuted text-xs font-bold uppercase tracking-widest">{t.dailyData}</p>
          </div>
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
              <span className={`text-[9px] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </div>
          </div>

          <div className="h-24 w-full touch-none"
            onTouchStart={() => setActiveTooltipIOB(true)}
            onTouchEnd={() => setActiveTooltipIOB(false)}
            onMouseEnter={() => setActiveTooltipIOB(true)}
            onMouseLeave={() => setActiveTooltipIOB(false)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={iobData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIOB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AGP_COLORS.IOB_CURVE} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={AGP_COLORS.IOB_CURVE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={[
                    iobTicks[0] - (30 * 60 * 1000),
                    iobTicks[iobTicks.length - 1] + (30 * 60 * 1000)
                  ]}
                  ticks={iobTicks}
                  padding={{ left: 15, right: 15 }}
                  tickFormatter={(unix) => {
                    const diffMs = unix - now.getTime();
                    const diffHrs = Math.round(diffMs / 3600000);
                    if (Math.abs(diffMs) < 60000) return 'Now';
                    return diffHrs > 0 ? `+${diffHrs}h` : `${diffHrs}h`;
                  }}
                  tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  active={activeTooltipIOB}
                  animationDuration={100}
                  animationEasing="ease-out"
                  cursor={activeTooltipIOB ? { stroke: isDark ? '#ffffff40' : '#00000040', strokeWidth: 2, strokeDasharray: '5 5' } : false}
                  content={({ active, payload }) => active && activeTooltipIOB && payload && payload.length ? (
                    <div className={`px-3 py-2 rounded-xl text-[10px] shadow-xl border ${isDark ? 'bg-gray-800 border-white/10 text-white' : 'bg-white border-gray-100 text-textMain'}`}>
                      <p className="font-bold opacity-60 mb-0.5">{payload[0].payload.displayTime}</p>
                      <p className="text-sm font-extrabold text-primary">{payload[0].payload.value.toFixed(1)} U</p>
                    </div>
                  ) : null}
                />
                <ReferenceLine x={now.getTime()} stroke={isDark ? '#6B7280' : '#9CA3AF'} strokeDasharray="3 3" strokeWidth={2} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={AGP_COLORS.IOB_CURVE}
                  strokeWidth={3}
                  fill="url(#colorIOB)"
                  animationDuration={1000}
                  dot={false}
                  activeDot={activeTooltipIOB ? { r: 6, fill: AGP_COLORS.IOB_CURVE, stroke: isDark ? '#1e293b' : '#ffffff', strokeWidth: 2 } : false}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* GRAFICO GLUCOSIO + INSULINA */}
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

          <div className="h-64 w-full" style={{ pointerEvents: 'none' }}>
            {myDayData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={myDayData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f3f4f6'} />

                  <XAxis
                    dataKey="time"
                    type="number"
                    scale="time"
                    domain={[startOfToday.getTime(), endOfToday.getTime()]}
                    ticks={glucoseTicks}
                    tickFormatter={(unix) => new Date(unix).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={10}
                  />

                  <YAxis
                    yAxisId="glucoseAxis"
                    type="number"
                    domain={yAxisDomain}
                    allowDataOverflow={false}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />

                  <YAxis
                    yAxisId="insulinAxis"
                    orientation="right"
                    domain={[0, 20]}
                    hide
                  />

                  <ReferenceArea
                    yAxisId="glucoseAxis"
                    y1={minTIR}
                    y2={maxTIR}
                    shape={(props: any) => {
                      const { x, y, width, height } = props;
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={AGP_COLORS.BG_TARGET_AREA}
                          opacity={AGP_COLORS.TARGET_BG_OPACITY}
                        />
                      );
                    }}
                  />
                  <ReferenceLine yAxisId="glucoseAxis" y={settings.targetBg} stroke={isDark ? '#475569' : '#e2e8f0'} strokeWidth={1} strokeDasharray="3 3" />
                  <ReferenceLine x={now.getTime()} stroke={isDark ? '#6B7280' : '#9CA3AF'} strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Now', position: 'top', fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10, fontWeight: 'bold' }} />

                  {/* UTILIZZO DELLA BARRA PERSONALIZZATA */}
                  <Bar
                    yAxisId="insulinAxis"
                    dataKey="units"
                    shape={<CustomInsulinBar />}
                    fill={AGP_COLORS.INSULIN_BAR}
                    isAnimationActive={true}
                  />

                  <Line
                    yAxisId="glucoseAxis"
                    type="monotone"
                    dataKey="glucose"
                    stroke="transparent"
                    strokeWidth={0}
                    dot={<CustomizedDot />}
                    activeDot={false}
                    animationDuration={1500}
                    isAnimationActive={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-gray-800' : 'bg-appBg'}`}><Activity size={32} className="text-textMuted opacity-30" /></div>
                <p className={`text-sm font-bold ${isDark ? 'text-gray-500' : 'text-textMuted'}`}>{t.noGlucoseToday}</p>
                <p className="text-[10px] uppercase font-black text-primary mt-1">{t.insertMeasurement}</p>
              </div>
            )}
          </div>
        </section>

        {/* --- TABELLA ANALISI PASTI (HOME) --- */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <h3 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-textMain'}`}>{t.mealAnalysis}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-textMuted">{t.mealAnalysisDesc}</p>
            </div>
            <button
              onClick={() => setShowFullMealAnalysis(true)}
              className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-primary' : 'text-primary'}`}
            >
              {t.more} <ChevronRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <div className={`inline-block min-w-full rounded-2xl overflow-hidden border ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-100'}`}>
              <table className="w-full">
                <thead>
                  <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                    <th className={`sticky left-0 z-10 px-2 py-2 text-left text-[9px] font-black uppercase tracking-wider ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                      {t.date}
                    </th>
                    {settings.variableInsulinEnabled ? (
                      settings.insulinSegments.map((segment, idx) => (
                        <th key={idx} className="px-1 py-2 text-center min-w-[50px]">
                          <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {segment.startTime.slice(0, 5)}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {segment.endTime.slice(0, 5)}
                            </span>
                          </div>
                        </th>
                      ))
                    ) : (
                      <>
                        {[['06:00', '11:00'], ['11:00', '17:00'], ['17:00', '23:59']].map((range, i) => (
                          <th key={i} className="px-1 py-2 text-center min-w-[50px]">
                            <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                              <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{range[0]}</span>
                              <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{range[1]}</span>
                            </div>
                          </th>
                        ))}
                      </>
                    )}
                    <th className={`px-2 py-2 text-center text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{t.totU}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/20">
                  {(() => {
                    const last3Days = Array.from({ length: 3 }, (_, i) => {
                      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0); return d;
                    });

                    return last3Days.map((date, dateIdx) => {
                      const dateKey = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                      const dayEntries = history.filter(e => {
                        const entryDate = new Date(e.timestamp);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() === date.getTime();
                      });

                      const totalDailyUnits = dayEntries.reduce((sum, e) => sum + (e.units || 0), 0);

                      const getEntriesInTimeSlot = (startTime: string, endTime: string) => {
                        return dayEntries.filter(e => {
                          const entryTime = new Date(e.timestamp);
                          const entryMinutes = entryTime.getHours() * 60 + entryTime.getMinutes();
                          const [startH, startM] = startTime.split(':').map(Number);
                          const [endH, endM] = endTime.split(':').map(Number);
                          const startMinutes = startH * 60 + startM;
                          let endMinutes = endH * 60 + endM;
                          if (endMinutes === 1439) endMinutes = 1440;
                          return entryMinutes >= startMinutes && entryMinutes < endMinutes;
                        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // MODIFICA: Ordina per data decrescente
                      };

                      const renderCell = (startTime: string, endTime: string, label: string) => {
                        const entries = getEntriesInTimeSlot(startTime, endTime);
                        const lastEntry = entries[0]; // MODIFICA: Prendi il primo (il più recente)
                        const count = entries.length;

                        return (
                          <td
                            className={`px-1 py-2 align-top h-full relative ${count > 0 ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                            onClick={() => {
                              if (count > 0) {
                                setSelectedSlot({ date: dateKey, label: label, entries: entries });
                              }
                            }}
                          >
                            {lastEntry ? (
                              <div className={`flex flex-col gap-1 justify-start items-center h-full min-h-[45px] p-1 rounded-lg ${count > 1 ? (isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100/50 border border-gray-200/50') : ''}`}>
                                {count > 1 && (
                                  <div className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-white shadow-sm ring-1 ring-white">
                                    {count}
                                  </div>
                                )}
                                {lastEntry.glucose > 0 ? (
                                  <div className={`text-xs font-black px-1.5 py-0.5 rounded-md w-full max-w-[45px] text-center shadow-sm ${lastEntry.glucose < minTIR ? 'text-red-600 bg-red-50 border border-red-100'
                                    : lastEntry.glucose > maxTIR
                                      ? lastEntry.glucose > 250 ? 'text-orange-600 bg-orange-50 border border-orange-100' : 'text-yellow-600 bg-yellow-50 border border-yellow-100'
                                      : 'text-green-600 bg-green-50 border border-green-100'
                                    }`}>
                                    {lastEntry.glucose}
                                  </div>
                                ) : null}
                                {lastEntry.units > 0 && (
                                  <div className={`text-[10px] font-bold px-1 py-0.5 rounded-md w-full max-w-[45px] text-center border ${isDark ? 'bg-blue-900/20 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                    {lastEntry.units}<span className="text-[8px] ml-0.5 opacity-70">U</span>
                                  </div>
                                )}
                                {lastEntry.carbs > 0 && (
                                  <div className={`text-[9px] font-bold px-1 py-0.5 rounded-md w-full max-w-[45px] text-center border mt-0.5 ${isDark ? 'bg-blue-900/10 text-blue-300 border-blue-800/50' : 'bg-blue-50/50 text-blue-600 border-blue-100'}`}>
                                    {lastEntry.carbs}<span className="text-[7px] ml-0.5 opacity-70">CHO</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-gray-300 text-[10px] py-2">-</div>
                            )}
                          </td>
                        );
                      };

                      return (
                        <tr key={dateIdx} className={isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                          <td className={`sticky left-0 z-10 px-2 py-3 text-[10px] font-black whitespace-nowrap align-middle border-r ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-textMain border-gray-100'}`}>
                            {dateKey}
                          </td>
                          {settings.variableInsulinEnabled ? (
                            settings.insulinSegments.map((segment, segIdx) => (
                              <React.Fragment key={segIdx}>
                                {renderCell(segment.startTime, segment.endTime, `${segment.startTime.slice(0, 5)}-${segment.endTime.slice(0, 5)}`)}
                              </React.Fragment>
                            ))
                          ) : (
                            <>
                              {renderCell('06:00', '11:00', t.breakfast)}
                              {renderCell('11:00', '17:00', t.lunch)}
                              {renderCell('17:00', '23:59', t.dinner)}
                            </>
                          )}
                          <td className="px-2 py-3 text-center align-middle">
                            {totalDailyUnits > 0 ? (
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isDark ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-textMain'}`}>
                                {totalDailyUnits.toFixed(1)}
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                        </tr>
                      );
                    }).filter(Boolean);
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* --- STORICO DETTAGLIATO (Ultimi 3) --- */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-textMain'}`}>{t.diary}</h3>
            {history.length > 3 && (
              <button
                onClick={() => setShowFullHistory(true)}
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-primary' : 'text-primary'}`}
              >
                {t.more} <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {recentHistory.length === 0 && <p className="text-center text-textMuted text-xs py-4">{t.noEventRecorded}</p>}
            {recentHistory.map((entry) => (
              <div key={entry.id} className={`p-4 rounded-[1.5rem] flex items-center justify-between border transition-all ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                  {/* ICONA: Glicemia colorata o siringa grigia */}
                  {entry.glucose > 0 ? (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${entry.glucose > maxTIR ? 'bg-orange-100 text-orange-600' : (entry.glucose < minTIR ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}`}>
                      {entry.glucose}
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <Syringe size={20} className={isDark ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2.5} />
                    </div>
                  )}
                  <div>
                    <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{formatDate(entry.timestamp)}</p>
                    <p className="text-[10px] font-bold text-textMuted">
                      {entry.carbs > 0 ? `${entry.carbs}g Carbo • ` : ''}{entry.mealType}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {/* LOGICA VISUALIZZAZIONE UNITÀ */}
                  {entry.mealType === 'Controllo' && entry.units === 0 ? (
                    <p className="text-xs font-bold text-gray-400 uppercase py-1">Glicemia</p>
                  ) : (
                    <p className="text-lg font-black text-primary">{entry.units} U</p>
                  )}

                  {/* NON mostrare "Consigliato" se è solo insulina (glucose === 0) */}
                  {entry.glucose > 0 && entry.recommendedUnits !== undefined && entry.recommendedUnits !== entry.units && (
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
      </div>

      {/* MODALE CRONOLOGIA COMPLETA (Lista) */}
      {showFullHistory && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFullHistory(false)}></div>
          <div className={`relative w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{t.fullHistory}</h3>
              <button onClick={() => setShowFullHistory(false)} className={`p-2 rounded-full ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col gap-3">
                {sortedHistory.map((entry) => (
                  <div key={entry.id} className={`p-4 rounded-[1.5rem] flex items-center justify-between border transition-all ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      {entry.glucose > 0 ? (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${entry.glucose > maxTIR ? 'bg-orange-100 text-orange-600' : (entry.glucose < minTIR ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}`}>
                          {entry.glucose}
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <Syringe size={20} className={isDark ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2.5} />
                        </div>
                      )}
                      <div>
                        <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{formatDate(entry.timestamp)}</p>
                        <p className="text-[10px] font-bold text-textMuted">
                          {entry.carbs > 0 ? `${entry.carbs}g Carbo • ` : ''}{entry.mealType}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {/* LOGICA VISUALIZZAZIONE UNITÀ */}
                      {entry.mealType === 'Controllo' && entry.units === 0 ? (
                        <p className="text-xs font-bold text-gray-400 uppercase py-1">Glicemia</p>
                      ) : (
                        <p className="text-lg font-black text-primary">{entry.units} U</p>
                      )}

                      {entry.glucose > 0 && entry.recommendedUnits !== undefined && entry.recommendedUnits !== entry.units && (
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
            </div>
          </div>
        </div>
      )}

      {/* MODALE ANALISI PASTI COMPLETA (Tabella Completa) */}
      {showFullMealAnalysis && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFullMealAnalysis(false)}></div>
          <div className={`relative w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{t.fullMealAnalysis}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-textMuted">{t.allDaysRecorded}</p>
              </div>
              <button onClick={() => setShowFullMealAnalysis(false)} className={`p-2 rounded-full ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-100'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                      <th className={`sticky left-0 top-0 z-20 px-2 py-2 text-left text-[9px] font-black uppercase tracking-wider ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                        {t.date}
                      </th>
                      {settings.variableInsulinEnabled ? (
                        settings.insulinSegments.map((segment, idx) => (
                          <th key={idx} className={`sticky top-0 z-10 px-1 py-2 text-center min-w-[50px] ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                              <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {segment.startTime.slice(0, 5)}
                              </span>
                              <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {segment.endTime.slice(0, 5)}
                              </span>
                            </div>
                          </th>
                        ))
                      ) : (
                        <>
                          {[['06:00', '11:00'], ['11:00', '17:00'], ['17:00', '23:59']].map((range, i) => (
                            <th key={i} className={`sticky top-0 z-10 px-1 py-2 text-center min-w-[50px] ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                              <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{range[0]}</span>
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{range[1]}</span>
                              </div>
                            </th>
                          ))}
                        </>
                      )}
                      <th className={`sticky top-0 z-10 px-2 py-2 text-center text-[9px] font-black uppercase tracking-wider ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{t.totU}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/20">
                    {(() => {
                      const oldestEntry = history.length > 0 ? new Date(Math.min(...history.map(e => new Date(e.timestamp).getTime()))) : new Date();
                      const today = new Date(); today.setHours(0, 0, 0, 0); oldestEntry.setHours(0, 0, 0, 0);
                      const daysDiff = Math.floor((today.getTime() - oldestEntry.getTime()) / (86400000));
                      const allDays = Array.from({ length: Math.max(daysDiff + 1, 7) }, (_, i) => {
                        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0); return d;
                      });

                      return allDays.map((date, dateIdx) => {
                        const dateKey = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                        const dayEntries = history.filter(e => {
                          const entryDate = new Date(e.timestamp);
                          entryDate.setHours(0, 0, 0, 0);
                          return entryDate.getTime() === date.getTime();
                        });

                        const totalDailyUnits = dayEntries.reduce((sum, e) => sum + (e.units || 0), 0);

                        const getEntriesInTimeSlot = (startTime: string, endTime: string) => {
                          return dayEntries.filter(e => {
                            const entryTime = new Date(e.timestamp);
                            const entryMinutes = entryTime.getHours() * 60 + entryTime.getMinutes();
                            const [startH, startM] = startTime.split(':').map(Number);
                            const [endH, endM] = endTime.split(':').map(Number);
                            const startMinutes = startH * 60 + startM;
                            let endMinutes = endH * 60 + endM;
                            if (endMinutes === 1439) endMinutes = 1440;
                            return entryMinutes >= startMinutes && entryMinutes < endMinutes;
                          }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // MODIFICA: Ordina per data decrescente
                        };

                        const renderCell = (startTime: string, endTime: string, label: string) => {
                          const entries = getEntriesInTimeSlot(startTime, endTime);
                          const lastEntry = entries[0]; // MODIFICA: Prendi il primo (il più recente)
                          const count = entries.length;

                          return (
                            <td
                              className={`px-1 py-2 align-top h-full relative ${count > 0 ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                              onClick={() => {
                                if (count > 0) {
                                  setSelectedSlot({ date: dateKey, label: label, entries: entries });
                                }
                              }}
                            >
                              {lastEntry ? (
                                <div className={`flex flex-col gap-1 justify-start items-center h-full min-h-[45px] p-1 rounded-lg ${count > 1 ? (isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100/50 border border-gray-200/50') : ''}`}>
                                  {count > 1 && (
                                    <div className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-white shadow-sm ring-1 ring-white">
                                      {count}
                                    </div>
                                  )}
                                  {lastEntry.glucose > 0 ? (
                                    <div className={`text-xs font-black px-1.5 py-0.5 rounded-md w-full max-w-[45px] text-center shadow-sm ${lastEntry.glucose < minTIR ? 'text-red-600 bg-red-50 border border-red-100'
                                      : lastEntry.glucose > maxTIR
                                        ? lastEntry.glucose > 250 ? 'text-orange-600 bg-orange-50 border border-orange-100' : 'text-yellow-600 bg-yellow-50 border border-yellow-100'
                                        : 'text-green-600 bg-green-50 border border-green-100'
                                      }`}>
                                      {lastEntry.glucose}
                                    </div>
                                  ) : null}
                                  {lastEntry.units > 0 && (
                                    <div className={`text-[10px] font-bold px-1 py-0.5 rounded-md w-full max-w-[45px] text-center border ${isDark ? 'bg-blue-900/20 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                      {lastEntry.units}<span className="text-[8px] ml-0.5 opacity-70">U</span>
                                    </div>
                                  )}
                                  {lastEntry.carbs > 0 && (
                                    <div className={`text-[9px] font-bold px-1 py-0.5 rounded-md w-full max-w-[45px] text-center border mt-0.5 ${isDark ? 'bg-blue-900/10 text-blue-300 border-blue-800/50' : 'bg-blue-50/50 text-blue-600 border-blue-100'}`}>
                                      {lastEntry.carbs}<span className="text-[7px] ml-0.5 opacity-70">cho</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-gray-300 text-[10px] py-2">-</div>
                              )}
                            </td>
                          );
                        };

                        return (
                          <tr key={dateIdx} className={isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                            <td className={`sticky left-0 z-10 px-2 py-3 text-[10px] font-black whitespace-nowrap align-middle border-r ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-textMain border-gray-100'}`}>
                              {dateKey}
                            </td>
                            {settings.variableInsulinEnabled ? (
                              settings.insulinSegments.map((segment, segIdx) => (
                                <React.Fragment key={segIdx}>
                                  {renderCell(segment.startTime, segment.endTime, `${segment.startTime.slice(0, 5)}-${segment.endTime.slice(0, 5)}`)}
                                </React.Fragment>
                              ))
                            ) : (
                              <>
                                {renderCell('06:00', '11:00', t.breakfast)}
                                {renderCell('11:00', '17:00', t.lunch)}
                                {renderCell('17:00', '23:59', t.dinner)}
                              </>
                            )}
                            <td className="px-2 py-3 text-center align-middle">
                              {totalDailyUnits > 0 ? (
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isDark ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-textMain'}`}>
                                  {totalDailyUnits.toFixed(1)}
                                </span>
                              ) : <span className="text-gray-300">-</span>}
                            </td>
                          </tr>
                        );
                      }).filter(Boolean);
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE POPUP DETTAGLIO FASCIA ORARIA */}
      {selectedSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSlot(null)}></div>
          <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white'}`}>

            {/* Intestazione Popup */}
            <div className={`p-5 border-b flex justify-between items-center ${isDark ? 'border-white/10 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
              <div>
                <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{selectedSlot.label}</h3>
                <p className="text-xs font-bold text-textMuted uppercase tracking-wider">{selectedSlot.date}</p>
              </div>
              <button onClick={() => setSelectedSlot(null)} className={`p-2 rounded-full ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>
                <X size={18} />
              </button>
            </div>

            {/* Lista Boli nella fascia */}
            <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {selectedSlot.entries.map((entry, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl border ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-center gap-3">
                    {/* Orario */}
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {new Date(entry.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Dettagli */}
                    <div className="flex flex-col">
                      {entry.glucose > 0 ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-black ${entry.glucose < minTIR ? 'text-red-500'
                              : entry.glucose > maxTIR ? 'text-yellow-500' : 'text-green-500'
                              }`}>
                              {entry.glucose}
                            </span>
                            <span className="text-[10px] text-textMuted font-bold">mg/dL</span>
                          </div>
                          {entry.carbs > 0 && <span className="text-[10px] text-textMuted font-medium">{entry.carbs}g CHO</span>}
                        </>
                      ) : (
                        <span className="text-[10px] text-textMuted font-bold">Solo Insulina</span>
                      )}
                    </div>
                  </div>

                  {/* Unità */}
                  <div className="flex flex-col items-end">
                    {/* LOGICA VISUALIZZAZIONE UNITÀ NEL POPUP */}
                    {entry.mealType === 'Controllo' && entry.units === 0 ? (
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Glicemia</span>
                    ) : (
                      <>
                        <span className={`text-lg font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{entry.units}</span>
                        <span className="text-[9px] font-bold text-textMuted uppercase -mt-1">Unità</span>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Totale della fascia */}
              {selectedSlot.entries.length > 1 && (
                <div className={`mt-2 pt-3 border-t flex justify-between items-center px-2 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                  <span className="text-xs font-bold text-textMuted uppercase">Totale Insulina</span>
                  <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-textMain'}`}>
                    {selectedSlot.entries.reduce((acc, curr) => acc + curr.units, 0).toFixed(1)} U
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};