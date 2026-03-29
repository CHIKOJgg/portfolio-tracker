import React, { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import { calcBondMetrics, fmt, r4, pnlCls } from '../utils/calc.js';
import { api } from '../api/client.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useToast } from '../hooks/useToast.jsx';
import { Section, Row, PageHeader, PlusFab, Spinner, TwxChips } from '../components/UI.jsx';
import TransactionList from '../components/TransactionList.jsx';
import TransactionForm from '../components/TransactionForm.jsx';

export default function BondsPage() {
  const { state, loadBondTxs, loadBondParams, loadSummary } = useStore();
  const { confirm, haptic } = useTelegram();
  const toast = useToast();
  const [tab,    setTab]    = useState('byn');
  const [view,   setView]   = useState('list');
  const [editTx, setEditTx] = useState(null);
  const [busy,   setBusy]   = useState(false);

  const txs  = state.bondTxs;
  const bp   = state.bondParams;
  const rate = state.currentRate ?? state.summary?.currentRate;

  useEffect(() => {
    const jobs = [];
    if (!txs) jobs.push(loadBondTxs());
    if (!bp)  jobs.push(loadBondParams());
    if (jobs.length) { setBusy(true); Promise.all(jobs).finally(() => setBusy(false)); }
  }, []);

  const m   = calcBondMetrics(txs || [], bp);
  const cur = m && rate ? m.totalUsd * +rate : null;
  const pnl = cur !== null ? cur - m.totalByn : null;

  async function handleSubmit(data) {
    if (editTx) await api.transactions.update(editTx.id, data);
    else        await api.transactions.create({ ...data, asset_type: 'bond' });
    haptic('medium');
    toast(editTx ? 'Обновлено ✓' : 'Добавлено ✓');
    setView('list'); setEditTx(null);
    await loadBondTxs(); loadSummary();
  }

  async function handleDelete(id) {
    const ok = await confirm('Удалить эту покупку?');
    if (!ok) return;
    await api.transactions.remove(id);
    haptic('medium'); toast('Удалено');
    await loadBondTxs(); loadSummary();
  }

  if (view !== 'list') {
    return (
      <div className="fade-in">
        <PageHeader
          title={editTx ? 'Редактировать' : 'Добавить облигации'}
          onBack={() => { setView('list'); setEditTx(null); }}
        />
        <TransactionForm
          type="bond" initial={editTx} currentRate={rate}
          onSubmit={handleSubmit}
          onCancel={() => { setView('list'); setEditTx(null); }}
        />
      </div>
    );
  }

  return (
    <div className="page-gap fade-in">
      <PageHeader title="📄 Облигации"
        action={<PlusFab onClick={() => { setEditTx(null); setView('add'); }} />} />

      {/* Sub tabs */}
      <div className="sub-tabs">
        <button className={`sub-tab${tab==='byn'?' active':''}`} onClick={() => setTab('byn')}>
          BYN-номинал
        </button>
        <button className={`sub-tab${tab==='usd'?' active':''}`} onClick={() => setTab('usd')}>
          USD-эквивалент
        </button>
      </div>

      {busy && !txs && <Spinner />}

      {m && (
        <>
          <div style={{ background:'var(--bg2)', borderRadius:'var(--r)', padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, color:'var(--hint)', marginBottom:2 }}>
                  {tab==='byn' ? 'Всего облигаций' : 'USD-эквивалент'}
                </div>
                <div style={{ fontSize:30, fontWeight:800 }}>
                  {tab==='byn' ? `${fmt(m.totalQty,0)} шт.` : `$ ${fmt(m.totalUsd,2)}`}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:12, color:'var(--hint)', marginBottom:2 }}>Затраты BYN</div>
                <div style={{ fontSize:18, fontWeight:700 }}>{fmt(m.totalByn,2)}</div>
              </div>
            </div>
            <TwxChips avg={m.avgTwx} min={m.minTwx} max={m.maxTwx} />
            {m.nkdTotal > 0 && (
              <div style={{ marginTop:10, fontSize:13, color:'var(--amber)' }}>
                НКД накопл.: <b>{m.nkdTotal.toFixed(4)}</b> BYN
              </div>
            )}
          </div>

          {tab === 'usd' && cur !== null && (
            <div style={{ display:'flex', gap:10 }}>
              {[
                { l:'Тек. стоимость (USD-экв)', v:`${fmt(cur,0)} BYN`, c:'' },
                { l:'P&L', v:`${+pnl>=0?'+':''}${fmt(pnl,2)} BYN`, c:pnlCls(pnl) },
              ].map(({ l,v,c }) => (
                <div key={l} style={{ flex:1, background:'var(--bg2)',
                                      borderRadius:'var(--r)', padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:'var(--hint)', marginBottom:3 }}>{l}</div>
                  <div className={c} style={{ fontSize:14, fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'byn' && bp && (
            <Section title="Параметры выпуска">
              <Row label="Номинал BYN"         value={`${fmt(bp.nominal_byn,2)} BYN`} />
              <Row label="USD-эквивалент ном."  value={`$ ${r4(bp.usd_equiv_nominal)}`} />
              <Row label="Ставка купона"        value={`${bp.coupon_rate}%`} />
              <Row label="Базовый курс USD"     value={r4(bp.base_rate_usd)} />
              <Row label="НКД текущий"          value={`${fmt(bp.nkd_current,4)} BYN`} />
              <Row label="Ближайший купон"      value={`${fmt(bp.next_coupon,4)} BYN`} />
              <Row label="Дата погашения"       value={bp.maturity_date?.split?.('T')[0] || '—'} />
              <Row label="Срок до погашения"    value={bp.maturity_years ? `${bp.maturity_years} лет` : '—'} />
            </Section>
          )}
        </>
      )}

      <Section title={`Покупки · ${txs?.length ?? 0}`}>
        {busy && !txs ? <Spinner /> : (
          <TransactionList
            transactions={txs} isBond
            onEdit={tx => { setEditTx(tx); setView('edit'); }}
            onDelete={handleDelete}
          />
        )}
      </Section>
    </div>
  );
}
