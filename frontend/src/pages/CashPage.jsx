import React, { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import { calcCashMetrics, fmt, r4, pnlCls } from '../utils/calc.js';
import { api } from '../api/client.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useToast } from '../hooks/useToast.jsx';
import { Section, PageHeader, PlusFab, Spinner, TwxChips } from '../components/UI.jsx';
import TransactionList from '../components/TransactionList.jsx';
import TransactionForm from '../components/TransactionForm.jsx';

export default function CashPage() {
  const { state, loadCashTxs, loadSummary } = useStore();
  const { confirm, haptic } = useTelegram();
  const toast = useToast();
  const [view,   setView]   = useState('list'); // list | add | edit
  const [editTx, setEditTx] = useState(null);
  const [busy,   setBusy]   = useState(false);

  const txs  = state.cashTxs;
  const rate = state.currentRate ?? state.summary?.currentRate;

  useEffect(() => {
    if (!txs) { setBusy(true); loadCashTxs().finally(() => setBusy(false)); }
  }, []);

  const m   = calcCashMetrics(txs || []);
  const cur = m && rate ? m.totalUsd * +rate : null;
  const pnl = cur !== null ? cur - m.totalByn : null;
  const pnlP= m?.totalByn > 0 && pnl !== null ? (pnl / m.totalByn) * 100 : null;

  async function handleSubmit(data) {
    if (editTx) await api.transactions.update(editTx.id, data);
    else        await api.transactions.create({ ...data, asset_type: 'cash_usd' });
    haptic('medium');
    toast(editTx ? 'Операция обновлена ✓' : 'Операция добавлена ✓');
    setView('list'); setEditTx(null);
    await loadCashTxs();
    loadSummary();
  }

  async function handleDelete(id) {
    const ok = await confirm('Удалить эту операцию?');
    if (!ok) return;
    await api.transactions.remove(id);
    haptic('medium'); toast('Удалено');
    await loadCashTxs(); loadSummary();
  }

  if (view !== 'list') {
    return (
      <div className="fade-in">
        <PageHeader
          title={editTx ? 'Редактировать' : 'Добавить USD'}
          onBack={() => { setView('list'); setEditTx(null); }}
        />
        <TransactionForm
          type="cash_usd" initial={editTx} currentRate={rate}
          onSubmit={handleSubmit}
          onCancel={() => { setView('list'); setEditTx(null); }}
        />
      </div>
    );
  }

  return (
    <div className="page-gap fade-in">
      <PageHeader title="💵 Наличные USD"
        action={<PlusFab onClick={() => { setEditTx(null); setView('add'); }} />} />

      {busy && !txs && <Spinner />}

      {m && (
        <>
          <div style={{ background:'var(--bg2)', borderRadius:'var(--r)', padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, color:'var(--hint)', marginBottom:2 }}>Всего USD</div>
                <div style={{ fontSize:32, fontWeight:800 }}>$ {fmt(m.totalUsd, 2)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:12, color:'var(--hint)', marginBottom:2 }}>Затраты BYN</div>
                <div style={{ fontSize:20, fontWeight:700 }}>{fmt(m.totalByn, 2)}</div>
              </div>
            </div>
            <TwxChips avg={m.avgTwx} min={m.minTwx} max={m.maxTwx} />
          </div>

          {cur !== null && (
            <div style={{ display:'flex', gap:10 }}>
              {[
                { l:'Тек. стоимость', v:`${fmt(cur,0)} BYN`, c:'' },
                { l:'P&L',           v:`${+pnl>=0?'+':''}${fmt(pnl,2)} BYN`, c:pnlCls(pnl) },
                { l:'Доходность',    v: pnlP!=null ? `${+pnlP>=0?'+':''}${fmt(pnlP,2)}%` : '—', c:pnlCls(pnlP) },
              ].map(({ l,v,c }) => (
                <div key={l} style={{ flex:1, background:'var(--bg2)',
                                      borderRadius:'var(--r)', padding:'10px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--hint)', marginBottom:3 }}>{l}</div>
                  <div className={c} style={{ fontSize:14, fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Section title={`Операции · ${txs?.length ?? 0}`}>
        {busy && !txs ? <Spinner /> : (
          <TransactionList
            transactions={txs} isBond={false}
            onEdit={tx => { setEditTx(tx); setView('edit'); }}
            onDelete={handleDelete}
          />
        )}
      </Section>
    </div>
  );
}
