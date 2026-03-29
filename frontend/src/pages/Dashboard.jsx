import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { fmt, r4, pct, pnlCls } from '../utils/calc.js';
import { Section, Row, Spinner } from '../components/UI.jsx';

export default function Dashboard() {
  const { state, loadSummary } = useStore();
  const nav = useNavigate();
  const { summary:s, loading, error, isOffline } = state;

  useEffect(() => { loadSummary(); }, []);

  const p = s?.portfolio, cm = s?.cash, bm = s?.bonds;

  return (
    <div className="page-gap fade-in">
      {isOffline && (
        <div className="offline-banner">⚠ Офлайн — показаны кэшированные данные</div>
      )}

      {/* Rate bar */}
      <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'2px 2px', fontSize:13 }}>
        <span style={{ color:'var(--hint)' }}>
          Курс НБРБ:{' '}
          <span style={{ color:'var(--text)', fontWeight:600 }}>
            {s?.currentRate ? `${(+s.currentRate).toFixed(4)} BYN` : '—'}
          </span>
        </span>
        <button onClick={loadSummary}
          style={{ color:'var(--btn)', fontSize:20, background:'none',
                   border:'none', cursor:'pointer', lineHeight:1, padding:'0 2px' }}>
          {loading ? '·' : '↻'}
        </button>
      </div>

      {error && !s && (
        <div style={{ textAlign:'center', padding:32 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>⚠️</div>
          <div style={{ color:'var(--hint)', marginBottom:16 }}>{error}</div>
          <button className="btn btn-primary" style={{ maxWidth:200 }} onClick={loadSummary}>
            Обновить
          </button>
        </div>
      )}

      {!s && loading && <Spinner />}

      {/* Hero TWX */}
      {p && (
        <div style={{ background:'var(--btn)', borderRadius:'var(--r)',
                      padding:'20px 20px 18px', color:'#fff' }}>
          <div style={{ fontSize:13, opacity:.8, marginBottom:4 }}>AVG TWX портфеля</div>
          <div style={{ fontSize:48, fontWeight:800, letterSpacing:-2, lineHeight:1 }}>
            {p.avgTwx ? (+p.avgTwx).toFixed(4) : '—'}
          </div>
          <div style={{ fontSize:13, opacity:.65, marginTop:2 }}>BYN / USD</div>
          <div style={{ display:'flex', gap:20, marginTop:18, paddingTop:14,
                        borderTop:'1px solid rgba(255,255,255,0.2)', flexWrap:'wrap' }}>
            {[
              { l:'Всего USD',    v:`$ ${fmt(p.totalUsd,2)}` },
              { l:'Затраты BYN', v:fmt(p.totalByn,2) },
              ...(s.pnlByn!=null ? [{
                l:'P&L BYN',
                v:`${+s.pnlByn>=0?'+':''}${fmt(s.pnlByn,2)}`,
                c: +s.pnlByn>=0 ? '#4cd964' : '#ff453a',
              }] : []),
            ].map(({ l, v, c }) => (
              <div key={l} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span style={{ fontSize:11, opacity:.7 }}>{l}</span>
                <span style={{ fontSize:15, fontWeight:700, color:c||'inherit' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current value row */}
      {s?.currentValueByn != null && (
        <div style={{ display:'flex', gap:10 }}>
          {[
            { l:'Тек. стоимость', v:`${fmt(s.currentValueByn,0)} BYN`, c:'' },
            { l:'Доходность',     v:pct(s.pnlPct), c:pnlCls(s.pnlPct) },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ flex:1, background:'var(--bg2)',
                                  borderRadius:'var(--r)', padding:'12px 14px' }}>
              <div style={{ fontSize:12, color:'var(--hint)', marginBottom:4 }}>{l}</div>
              <div className={c} style={{ fontSize:16, fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Asset cards */}
      {p && (
        <Section title="Активы">
          <div style={{ display:'flex', flexDirection:'column', gap:8, padding:12 }}>
            {[
              { icon:'💵', label:'Наличные USD',         avg:cm?.avgTwx, min:cm?.minTwx, max:cm?.maxTwx, path:'/cash' },
              { icon:'📄', label:'Облигации (BYN-ном.)',  avg:bm?.avgTwx, min:bm?.minTwx, max:bm?.maxTwx, path:'/bonds' },
              { icon:'💱', label:'Облигации (USD-экв.)',  avg:bm?.avgTwx, min:bm?.minTwx, max:bm?.maxTwx, path:'/bonds' },
            ].map(({ icon, label, avg, min, max, path }) => (
              <div key={label} onClick={() => nav(path)}
                style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)',
                          padding:'12px 14px', cursor:'pointer',
                          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, color:'var(--hint)', marginBottom:2 }}>{icon} {label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:'var(--btn)' }}>
                    {avg ? r4(avg) : '—'}
                  </div>
                </div>
                {avg && (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, color:'var(--green)' }}>MIN {r4(min)}</div>
                    <div style={{ fontSize:12, color:'var(--red)', marginTop:3 }}>MAX {r4(max)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Details */}
      {p && (
        <Section title="Детали">
          <Row label="💵 USD наличные" chevron onClick={() => nav('/cash')}
            value={cm ? `$ ${fmt(cm.totalUsd,2)}` : '—'}
            sub={cm ? `${fmt(cm.totalByn,0)} BYN · ${cm.count} сделок` : 'нет данных'} />
          <Row label="📄 Облигации" chevron onClick={() => nav('/bonds')}
            value={bm ? `${fmt(bm.totalQty,0)} шт.` : '—'}
            sub={bm ? `$ ${fmt(bm.totalUsd,2)} USD-экв · ${bm.count} покупок` : 'нет данных'} />
          {bm?.nkdTotal > 0 && (
            <Row label="НКД накопленный"
              value={`${bm.nkdTotal.toFixed(4)} BYN`}
              sub="по всем облигациям" />
          )}
        </Section>
      )}
    </div>
  );
}
