'use client';

import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Filler, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend);

type EntryType = 'sale' | 'cost';
interface Entry { id: number; type: EntryType; date: string; cat: string; supply: number; vat: number; total: number; memo: string; }

const fmt = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');
const fmtS = (n: number) => {
  const a = Math.abs(Math.round(n));
  if (a >= 100000000) return (n < 0 ? '-' : '') + (a / 100000000).toFixed(1) + '억';
  if (a >= 10000) return (n < 0 ? '-' : '') + (a / 10000).toFixed(0) + '만';
  return fmt(n);
};

const G = '#1D9E75', R = '#E24B4A', B = '#378ADD';
const CAT_C = ['#E24B4A','#BA7517','#185FA5','#534AB7','#993556','#0F6E56','#888780'];

function calcIT(p: number) {
  const b = Math.max(0, p - 1500000);
  if (b <= 14000000) return Math.round(b * 0.06);
  if (b <= 50000000) return Math.round(840000 + (b - 14000000) * 0.15);
  if (b <= 88000000) return Math.round(6240000 + (b - 50000000) * 0.24);
  if (b <= 150000000) return Math.round(15360000 + (b - 88000000) * 0.35);
  return Math.round(37060000 + (b - 150000000) * 0.38);
}

function getMD(entries: Entry[], month: string) {
  const me = entries.filter(e => e.date.startsWith(month));
  const s = me.filter(e => e.type === 'sale').reduce((a, e) => a + e.supply, 0);
  const c = me.filter(e => e.type === 'cost').reduce((a, e) => a + e.supply, 0);
  const ov = me.filter(e => e.type === 'sale').reduce((a, e) => a + e.vat, 0);
  const iv = me.filter(e => e.type === 'cost').reduce((a, e) => a + e.vat, 0);
  return { sales: s, costs: c, profit: s - c, ovat: ov, ivat: iv, vatPay: Math.max(0, ov - iv), entries: me };
}

function last6() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return d.toISOString().slice(0, 7);
  });
}

const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ type: 'sale', date: today(), cat: '매출', amount: '', vatMode: 'include', memo: '' });
  const [bizType, setBizType] = useState('general');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem('yta_v2'); if (s) setEntries(JSON.parse(s)); } catch {}
  }, []);

  const save = (e: Entry[]) => { setEntries(e); try { localStorage.setItem('yta_v2', JSON.stringify(e)); } catch {} };
  const addE = () => {
    const raw = parseFloat(form.amount);
    if (!raw || isNaN(raw)) { alert('금액을 입력하세요'); return; }
    const sup = form.vatMode === 'include' ? Math.round(raw / 1.1) : Math.round(raw);
    const vat = Math.round(sup * 0.1);
    save([{ id: Date.now(), type: form.type as EntryType, date: form.date, cat: form.cat, supply: sup, vat, total: sup + vat, memo: form.memo }, ...entries]);
    setForm(f => ({ ...f, amount: '', memo: '', date: today() }));
  };
  const delE = (id: number) => save(entries.filter(e => e.id !== id));

  const m6 = last6();
  const md6 = m6.map(m => getMD(entries, m));
  const cur = new Date().toISOString().slice(0, 7);
  const curD = getMD(entries, cur);
  const selD = getMD(entries, selMonth);
  const allMonths = [...new Set([...m6, ...entries.map(e => e.date.slice(0, 7))])].sort().reverse().slice(0, 12);

  const now = new Date();
  const vdl = [{ m: 1, d: 25, l: '부가세 신고(1기)' }, { m: 7, d: 25, l: '부가세 신고(2기)' }];
  let minD = Infinity, nextL = '';
  vdl.forEach(v => { let dd = new Date(2026, v.m - 1, v.d); if (dd < now) dd = new Date(2027, v.m - 1, v.d); const df = Math.ceil((dd.getTime() - now.getTime()) / 86400000); if (df < minD) { minD = df; nextL = v.l; } });

  const ap = curD.profit * 12;
  const tb = Math.max(0, ap - 1500000);
  const it = calcIT(ap);
  let rl = '6%';
  if (tb > 150000000) rl = '38%'; else if (tb > 88000000) rl = '35%'; else if (tb > 50000000) rl = '24%'; else if (tb > 14000000) rl = '15%';

  const aov = entries.filter(e => e.type === 'sale').reduce((a, e) => a + e.vat, 0);
  const aiv = entries.filter(e => e.type === 'cost').reduce((a, e) => a + e.vat, 0);

  const catMap: Record<string, number> = {};
  selD.entries.filter(e => e.type === 'cost').forEach(e => { catMap[e.cat] = (catMap[e.cat] || 0) + e.supply; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxC = cats.length ? cats[0][1] : 1;
  const mg = selD.sales > 0 ? Math.round(selD.profit / selD.sales * 100) : 0;

  const sched = [
    { date: '2026-01-25', label: '부가가치세 신고 (1기 예정)', type: 'vat' },
    { date: '2026-02-10', label: '사업장 현황신고 (간이과세자)', type: 'biz' },
    { date: '2026-05-31', label: '종합소득세 신고 납부', type: 'income' },
    { date: '2026-07-25', label: '부가가치세 신고 (2기 예정)', type: 'vat' },
    { date: '2026-11-30', label: '종합소득세 중간예납', type: 'income' },
    { date: '2027-01-25', label: '부가가치세 신고 (2027 1기)', type: 'vat' },
  ];

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const msg = `[요거트아이스크림의정석 매장관리앱]\n매출·세금을 스마트하게 관리하세요!\n\n${url}`;
    try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch {}
    try { await navigator.share({ title: '매장 세금관리 앱', text: msg, url }); } catch {}
  };

  const tc = (t: string) => `flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent'}`;
  const mc = (l: string, v: string, c = '') => (
    <div key={l} className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1">{l}</p>
      <p className={`text-lg font-medium ${c || 'text-gray-900'}`}>{v}</p>
    </div>
  );
  const catRows = (type: string) => type === 'sale' ? ['매출','배달매출','기타수입'] : ['식재료','인건비','임대료','소모품','마케팅','공과금','기타'];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans pb-24">
      {/* Header */}
      <div className="px-4 pt-safe pt-6 pb-3 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-sm font-medium text-gray-900">요거트아이스크림의정석</h1>
            <p className="text-xs text-gray-400">매출 · 세금 관리</p>
          </div>
          <button onClick={handleShare} className="bg-yellow-400 text-yellow-900 text-xs px-3 py-1.5 rounded-lg font-medium">
            {copied ? '복사됨!' : '카카오 공유'}
          </button>
        </div>
      </div>

      {/* VAT Banner */}
      <div className="mx-4 mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 flex justify-between items-center">
        <div>
          <p className="text-xs font-medium text-amber-700">{nextL} D-{minD}</p>
          <p className="text-xs text-amber-500 mt-0.5">이번 달 예상 부가세</p>
        </div>
        <p className="text-xl font-semibold text-amber-700">{fmt(curD.vatPay)}</p>
      </div>

      {/* Tabs */}
      <div className="flex px-2 mt-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        {[['dashboard','대시보드'],['input','입력'],['report','리포트'],['tax','세금'],['calendar','일정']].map(([id, l]) => (
          <button key={id} className={tc(id)} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* DASHBOARD */}
        {tab === 'dashboard' && <>
          <div className="grid grid-cols-2 gap-2.5">
            {mc('이번 달 매출', fmt(curD.sales), 'text-green-600')}
            {mc('이번 달 비용', fmt(curD.costs), 'text-red-500')}
            {mc('순이익', fmt(curD.profit), curD.profit >= 0 ? 'text-green-600' : 'text-red-500')}
            {mc('예상 종소세(연)', fmt(calcIT(curD.profit * 12)), 'text-amber-600')}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">최근 6개월</p>
            <div style={{ height: 180 }}>
              <Bar data={{ labels: m6.map(m => m.slice(5) + '월'), datasets: [{ label: '매출', data: md6.map(d => d.sales), backgroundColor: G, borderRadius: 3 }, { label: '비용', data: md6.map(d => d.costs), backgroundColor: R, borderRadius: 3 }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 }, autoSkip: false } }, y: { ticks: { callback: v => fmtS(+v), font: { size: 10 } } } } }} />
            </div>
            <div className="flex gap-4 mt-2">
              {[['매출', G], ['비용', R]].map(([l, c]) => <span key={l} className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }} />{l}</span>)}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">최근 거래</p>
            {!entries.length ? <p className="text-xs text-gray-300 text-center py-4">내역이 없습니다</p> : entries.slice(0, 5).map(e => (
              <div key={e.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div><div className="flex items-center gap-1.5"><span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${e.type === 'sale' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{e.type === 'sale' ? '매출' : '매입'}</span><span className="text-sm text-gray-700">{e.cat}</span></div><p className="text-xs text-gray-400">{e.date}</p></div>
                <span className={`text-sm font-medium ${e.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>{e.type === 'sale' ? '+' : '-'}{fmt(e.total)}</span>
              </div>
            ))}
          </div>
        </>}

        {/* INPUT */}
        {tab === 'input' && <>
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">거래 입력</p>
            {([
              ['구분', <select key="t" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, cat: e.target.value === 'sale' ? '매출' : '식재료' }))}><option value="sale">매출 (수입)</option><option value="cost">매입/비용 (지출)</option></select>],
              ['날짜', <input key="d" type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />],
              ['카테고리', <select key="c" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>{catRows(form.type).map(c => <option key={c}>{c}</option>)}</select>],
              ['금액 (원)', <input key="a" type="number" inputMode="numeric" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5" placeholder="예: 500000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />],
              ['부가세', <select key="v" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white" value={form.vatMode} onChange={e => setForm(f => ({ ...f, vatMode: e.target.value }))}><option value="include">포함 (VAT 포함금액)</option><option value="exclude">별도 (공급가액만)</option></select>],
              ['메모', <input key="m" type="text" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5" placeholder="선택사항" value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />],
            ] as [string, React.ReactNode][]).map(([l, inp]) => <div key={l}><p className="text-xs text-gray-400 mb-1">{l}</p>{inp}</div>)}
            <div className="flex gap-2 pt-1">
              <button onClick={addE} className="flex-1 bg-gray-900 text-white text-sm py-3 rounded-xl font-medium">추가하기</button>
              <button onClick={() => setForm(f => ({ ...f, amount: '', memo: '', date: today() }))} className="px-4 text-sm border border-gray-200 rounded-xl text-gray-500">초기화</button>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium">전체 내역</p><span className="text-xs text-gray-400">{entries.length}건</span></div>
            {!entries.length ? <p className="text-xs text-gray-300 text-center py-4">내역이 없습니다</p> : entries.map(e => (
              <div key={e.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <div><div className="flex items-center gap-1.5"><span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${e.type === 'sale' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{e.type === 'sale' ? '매출' : '매입'}</span><span className="text-sm text-gray-700 font-medium">{e.cat}</span></div><p className="text-xs text-gray-400">{e.date}{e.memo ? ' · ' + e.memo : ''}</p></div>
                <div className="flex items-center gap-2"><span className={`text-sm font-medium ${e.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>{e.type === 'sale' ? '+' : '-'}{fmt(e.total)}</span><button onClick={() => delE(e.id)} className="text-gray-300 text-xs px-1 py-0.5">✕</button></div>
              </div>
            ))}
          </div>
        </>}

        {/* REPORT */}
        {tab === 'report' && <>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">월 선택</p>
            <div className="flex flex-wrap gap-2">
              {allMonths.map(m => <button key={m} onClick={() => setSelMonth(m)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selMonth === m ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500'}`}>{m.slice(0, 4)}년 {m.slice(5)}월</button>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {mc('매출', fmt(selD.sales), 'text-green-600')}
            {mc('비용', fmt(selD.costs), 'text-red-500')}
            {mc('순이익', fmt(selD.profit), selD.profit >= 0 ? 'text-green-600' : 'text-red-500')}
            {mc('이익률', `${mg}%`, mg >= 0 ? 'text-green-600' : 'text-red-500')}
            {mc('매출 세액', fmt(selD.ovat))}
            {mc('납부 부가세', fmt(selD.vatPay), 'text-amber-600')}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">매출 / 비용 / 순이익</p>
            <div style={{ height: 180 }}>
              <Bar data={{ labels: ['매출', '비용', '순이익'], datasets: [{ data: [selD.sales, selD.costs, selD.profit], backgroundColor: [G, R, selD.profit >= 0 ? B : R], borderRadius: 5 }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 11 }, autoSkip: false } }, y: { ticks: { callback: v => fmtS(+v), font: { size: 10 } } } } }} />
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">비용 카테고리별</p>
            {!cats.length ? <p className="text-xs text-gray-300">비용 내역이 없습니다</p> : cats.map(([cat, amt], i) => (
              <div key={cat} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 w-14 shrink-0">{cat}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round(amt / maxC * 100)}%`, background: CAT_C[i % CAT_C.length] }} /></div>
                <span className="text-xs text-gray-500 w-20 text-right shrink-0">{fmt(amt)}</span>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">6개월 순이익 추이</p>
            <div style={{ height: 160 }}>
              <Line data={{ labels: m6.map(m => m.slice(5) + '월'), datasets: [{ label: '순이익', data: md6.map(d => d.profit), borderColor: B, backgroundColor: 'rgba(55,138,221,0.08)', borderWidth: 2, pointRadius: 4, pointBackgroundColor: B, fill: true, tension: 0.3 }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 }, autoSkip: false } }, y: { ticks: { callback: v => fmtS(+v), font: { size: 10 } } } } }} />
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">월별 손익 요약</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full" style={{ minWidth: 400, tableLayout: 'fixed' }}>
                <thead><tr className="text-gray-400 border-b border-gray-100">{['월','매출','비용','순이익','이익률','부가세'].map(h => <th key={h} className="text-left py-2 px-1 font-normal">{h}</th>)}</tr></thead>
                <tbody>
                  {m6.map(m => { const md = getMD(entries, m); const mg2 = md.sales > 0 ? Math.round(md.profit / md.sales * 100) : 0; const isSel = m === selMonth; return (
                    <tr key={m} className={`border-b border-gray-50 last:border-0 cursor-pointer ${isSel ? 'bg-gray-50' : ''}`} onClick={() => setSelMonth(m)}>
                      <td className={`py-2 px-1 ${isSel ? 'font-medium' : 'text-gray-500'}`}>{m.slice(5)}월</td>
                      <td className="py-2 px-1 text-green-600">{fmtS(md.sales)}</td>
                      <td className="py-2 px-1 text-red-500">{fmtS(md.costs)}</td>
                      <td className={`py-2 px-1 ${md.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtS(md.profit)}</td>
                      <td className={`py-2 px-1 ${mg2 >= 0 ? 'text-green-600' : 'text-red-500'}`}>{mg2}%</td>
                      <td className="py-2 px-1 text-amber-600">{fmtS(md.vatPay)}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">{selMonth.slice(0, 4)}년 {selMonth.slice(5)}월 상세</p>
            {!selD.entries.length ? <p className="text-xs text-gray-300 text-center py-4">해당 월 내역이 없습니다</p> : selD.entries.map(e => (
              <div key={e.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <div><div className="flex items-center gap-1.5"><span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${e.type === 'sale' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{e.type === 'sale' ? '매출' : '매입'}</span><span className="text-sm text-gray-700">{e.cat}</span></div><p className="text-xs text-gray-400">{e.date}{e.memo ? ' · ' + e.memo : ''}</p></div>
                <span className={`text-sm font-medium ${e.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>{e.type === 'sale' ? '+' : '-'}{fmt(e.total)}</span>
              </div>
            ))}
          </div>
        </>}

        {/* TAX */}
        {tab === 'tax' && <>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">사업자 설정</p>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white" value={bizType} onChange={e => setBizType(e.target.value)}>
              <option value="general">일반과세자 (연매출 8천만원 이상)</option>
              <option value="simple">간이과세자 (연매출 8천만원 미만)</option>
            </select>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">부가가치세 계산</p>
            {[['매출 세액 (매출 × 10%)', fmt(aov), ''], ['매입 세액 공제 (비용 × 10%)', fmt(aiv), ''], ['납부 부가세', fmt(Math.max(0, aov - aiv)), 'text-red-500 font-medium']].map(([l, v, c], i, arr) => (
              <div key={l} className={`flex justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : 'border-t border-gray-100 mt-1 pt-3'}`}>
                <span className="text-sm text-gray-600">{l}</span><span className={`text-sm ${c || 'text-gray-900'}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">종합소득세 추정</p>
            <p className="text-xs text-gray-300 mb-3">참고용 · 신고 전 세무사 확인 필수</p>
            {[['연간 추정 순이익 (이번달×12)', fmt(ap), ''], ['기본 공제', '- ₩1,500,000', ''], ['과세표준 (추정)', fmt(tb), ''], ['적용 세율', rl, ''], ['예상 종합소득세', fmt(it), 'text-red-500 font-medium']].map(([l, v, c], i, arr) => (
              <div key={l} className={`flex justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : 'border-t border-gray-100 mt-1 pt-3'}`}>
                <span className="text-sm text-gray-600">{l}</span><span className={`text-sm ${c || 'text-gray-900'}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">절세 핵심 포인트</p>
            {['연금저축+IRP 납입 → 최대 900만원 세액공제','노란우산공제 가입 → 최대 500만원 소득공제','사업용 카드·계좌 분리 → 경비 인정 확대','인건비 원천징수 신고 → 전액 경비 처리','결손금 발생 시 반드시 신고 → 15년 이월'].map(t => (
              <p key={t} className="text-xs text-amber-700 mt-1.5 flex gap-1.5"><span className="shrink-0">·</span>{t}</p>
            ))}
          </div>
        </>}

        {/* CALENDAR */}
        {tab === 'calendar' && <>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">2026년 세금 신고 일정</p>
            {sched.map(s => {
              const dl = new Date(s.date); const diff = Math.ceil((dl.getTime() - now.getTime()) / 86400000);
              const isPast = diff < 0;
              const cls = isPast ? 'bg-gray-100 text-gray-400' : diff <= 30 ? 'bg-red-50 text-red-600' : diff <= 60 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600';
              const tc2 = s.type === 'vat' ? 'text-blue-500' : s.type === 'income' ? 'text-amber-600' : 'text-gray-400';
              return (
                <div key={s.date} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                  <div><p className="text-sm text-gray-800 font-medium">{s.label}</p><p className={`text-xs mt-0.5 ${tc2}`}>{s.date}</p></div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{isPast ? '완료' : `D-${diff}`}</span>
                </div>
              );
            })}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">세금 안내</p>
            {[['부가가치세','일반과세자 연 2회(1·7월), 간이과세자 연 1회(1월) 신고'],['종합소득세','매년 5월 신고 · 무신고 시 20% 가산세'],['중간예납','종소세의 절반을 11월에 미리 납부'],['노란우산공제','소상공인 전용 · 연 최대 500만원 소득공제']].map(([t, d]) => (
              <div key={t} className="mb-3 last:mb-0"><p className="text-sm font-medium text-gray-800">{t}</p><p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{d}</p></div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">앱 공유</p>
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">링크를 복사해서 카카오톡으로 보내면 다른 기기에서도 사용 가능합니다. 데이터는 각 기기에 따로 저장됩니다.</p>
            <button onClick={handleShare} className={`w-full text-sm py-3 rounded-xl font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
              {copied ? '링크 복사 완료! 카카오톡에 붙여넣기 하세요' : '카카오톡으로 공유하기'}
            </button>
          </div>
        </>}

      </div>
    </div>
  );
}
