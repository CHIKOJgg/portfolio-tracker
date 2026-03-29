import React, { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import { api } from '../api/client.js';
import { useToast } from '../hooks/useToast.jsx';
import { useTelegram } from '../hooks/useTelegram.js';
import { Section, Row, Field, PageHeader, Spinner, Btn } from '../components/UI.jsx';
import { r4 } from '../utils/calc.js';

/* ── Bond Params Editor ──────────────────────────────────── */
function BondParamsEditor({ params, onSave, onBack }) {
  const [form, setForm] = useState({
    nominal_byn:       String(params?.nominal_byn       ?? 500),
    usd_equiv_nominal: String(params?.usd_equiv_nominal  ?? 175.3894),
    coupon_rate:       String(params?.coupon_rate        ?? 7.0),
    base_rate_usd:     String(params?.base_rate_usd      ?? 2.8508),
    base_rate_date:    (params?.base_rate_date    ?? '2026-01-29').split('T')[0],
    nkd_current:       String(params?.nkd_current        ?? 1.8164),
    next_coupon:       String(params?.next_coupon         ?? 2.3209),
    next_coupon_date:  (params?.next_coupon_date  ?? '2026-04-08').split('T')[0],
    maturity_date:     (params?.maturity_date     ?? '2029-11-06').split('T')[0],
    maturity_years:    String(params?.maturity_years      ?? 3.62),
  });
  const [saving, setSaving] = useState(false);

  const FIELDS = [
    ['nominal_byn',       'Номинал BYN',                   'number'],
    ['usd_equiv_nominal', 'USD-эквивалент номинала',        'number'],
    ['coupon_rate',       'Ставка купона %',                'number'],
    ['base_rate_usd',     'Базовый курс USD',               'number'],
    ['base_rate_date',    'Дата базового параметра',         'date'],
    ['nkd_current',       'НКД текущий (BYN-экв)',          'number'],
    ['next_coupon',       'Ближайший купон (BYN-экв)',       'number'],
    ['next_coupon_date',  'Дата следующей выплаты купона',   'date'],
    ['maturity_date',     'Дата погашения',                 'date'],
    ['maturity_years',    'Срок до погашения (лет)',         'number'],
  ];

  async function save() {
    setSaving(true);
    try {
      const payload = {};
      for (const [key, , type] of FIELDS) {
        payload[key] = type === 'date' ? form[key] : parseFloat(form[key]);
      }
      await onSave(payload);
    } finally { setSaving(false); }
  }

  return (
    <div className="fade-in">
      <PageHeader title="Параметры выпуска" onBack={onBack} />
      <div className="page-gap">
        {FIELDS.map(([key, label, type]) => (
          <Field key={key} label={label}>
            <input
              type={type} inputMode={type==='number'?'decimal':undefined}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </Field>
        ))}
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить параметры'}
        </Btn>
      </div>
    </div>
  );
}

/* ── Simulator ───────────────────────────────────────────── */
function Simulator({ onBack }) {
  const [type,    setType]    = useState('cash_usd');
  const [qty,     setQty]     = useState('');
  const [price,   setPrice]   = useState('');
  const [rateUsd, setRateUsd] = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  async function calc() {
    if (!qty || !price) return;
    setLoading(true);
    try {
      const r = await api.sim.calc({
        type, quantity: parseFloat(qty),
        price_byn: parseFloat(price),
        rate_usd:  rateUsd ? parseFloat(rateUsd) : null,
      });
      setResult(r);
    } finally { setLoading(false); }
  }

  const delta = result?.twxDelta;

  return (
    <div className="fade-in">
      <PageHeader title='Что если?' onBack={onBack} />
      <div className="page-gap">
        <div style={{ display:'flex', gap:8 }}>
          {[['cash_usd','💵 Наличные'],['bond','📄 Облигации']].map(([v,l]) => (
            <button key={v} onClick={() => { setType(v); setResult(null); }} style={{
              flex:1, padding:'10px 0', borderRadius:'var(--r-sm)',
              background: type===v ? 'var(--btn)' : 'var(--bg3)',
              color: type===v ? '#fff' : 'var(--hint)',
              fontWeight:600, fontSize:14, cursor:'pointer', border:'none',
            }}>{l}</button>
          ))}
        </div>

        <Field label={type==='cash_usd' ? 'Количество USD' : 'Количество облигаций'}>
          <input type="number" inputMode="decimal" placeholder="0"
            value={qty} onChange={e => setQty(e.target.value)} />
        </Field>

        <Field label={type==='cash_usd' ? 'Курс BYN/USD' : 'Цена облигации BYN'}>
          <input type="number" inputMode="decimal" placeholder="0"
            value={price} onChange={e => setPrice(e.target.value)} />
        </Field>

        {type==='bond' && (
          <Field label="Курс USD/BYN при покупке (опционально)">
            <input type="number" inputMode="decimal" placeholder="2.8508"
              value={rateUsd} onChange={e => setRateUsd(e.target.value)} />
          </Field>
        )}

        <Btn onClick={calc} disabled={loading || !qty || !price}>
          {loading ? 'Считаю...' : 'Рассчитать'}
        </Btn>

        {result && (
          <div className="fade-in" style={{ background:'var(--bg3)',
                                            borderRadius:'var(--r)', padding:16 }}>
            <div style={{ fontSize:13, color:'var(--hint)', marginBottom:12 }}>Результат</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:'var(--hint)' }}>Текущий TWX</div>
                <div style={{ fontSize:24, fontWeight:700 }}>{r4(result.old?.avgTwx)}</div>
              </div>
              <div style={{ fontSize:24, color:'var(--hint)' }}>→</div>
              <div style={{ flex:1, textAlign:'right' }}>
                <div style={{ fontSize:11, color:'var(--hint)' }}>После сделки</div>
                <div style={{ fontSize:24, fontWeight:700,
                  color: delta<=0 ? 'var(--green)' : 'var(--red)' }}>
                  {r4(result.new?.avgTwx)}
                </div>
              </div>
            </div>
            <div style={{ marginTop:12, padding:'8px 12px', background:'var(--bg2)',
                          borderRadius:'var(--r-sm)', display:'flex',
                          justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--hint)' }}>Изменение TWX</span>
              <span style={{ fontSize:15, fontWeight:700,
                             color: delta<=0 ? 'var(--green)' : 'var(--red)' }}>
                {delta >= 0 ? '+' : ''}{delta?.toFixed(4)}
              </span>
            </div>
            {delta < 0 && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--green)', textAlign:'center' }}>
                ✓ Сделка снижает среднюю цену входа
              </div>
            )}
            {delta > 0 && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--red)', textAlign:'center' }}>
                ↑ Сделка повышает среднюю цену входа
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Settings Main ───────────────────────────────────────── */
export default function SettingsPage() {
  const { state, loadBondParams, loadRate, loadSummary } = useStore();
  const toast = useToast();
  const { haptic } = useTelegram();
  const [section,    setSection]    = useState(null);
  const [manualRate, setManualRate] = useState('');
  const [busy,       setBusy]       = useState(false);

  const bp   = state.bondParams;
  const rate = state.currentRate ?? state.summary?.currentRate;

  useEffect(() => {
    if (!bp) { setBusy(true); loadBondParams().finally(() => setBusy(false)); }
  }, []);

  async function saveBondParams(data) {
    await api.bonds.updateParams(data);
    await loadBondParams();
    toast('Параметры сохранены ✓'); haptic('medium');
    setSection(null);
  }

  async function refreshRate() {
    setBusy(true);
    try { await loadRate(); loadSummary(); toast('Курс обновлён ✓'); }
    catch { toast('Не удалось обновить курс', 'error'); }
    finally { setBusy(false); }
  }

  async function saveManualRate() {
    const r = parseFloat(manualRate);
    if (!r || r <= 0) return toast('Введите корректный курс', 'error');
    try {
      await api.rates.setManual(r);
      await loadRate(); loadSummary();
      toast(`Курс установлен: ${r.toFixed(4)}`); haptic('medium');
      setManualRate('');
    } catch (e) { toast(e.message, 'error'); }
  }

  if (section === 'bond-params') {
    return busy ? <Spinner /> : (
      <BondParamsEditor params={bp} onSave={saveBondParams} onBack={() => setSection(null)} />
    );
  }
  if (section === 'simulator') {
    return <Simulator onBack={() => setSection(null)} />;
  }

  return (
    <div className="page-gap fade-in">
      <div style={{ padding:'14px 0 4px' }}>
        <h1 style={{ fontSize:22, fontWeight:700 }}>⚙️ Настройки</h1>
      </div>

      <Section title="Инструменты">
        <Row label='🔢 Калькулятор "что если"'
          sub="Симуляция новой сделки" chevron
          onClick={() => setSection('simulator')} value="" />
        <Row label="📋 Параметры облигации"
          sub="Номинал, НКД, купон, даты" chevron
          onClick={() => setSection('bond-params')} value="" />
      </Section>

      <Section title="Курс USD / BYN">
        <Row
          label={busy ? 'Обновление...' : 'Курс НБРБ'}
          value={rate ? `${(+rate).toFixed(4)}` : '—'}
          sub="Обновляется каждый час · нажмите для обновления"
          onClick={refreshRate} chevron
        />
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--bg3)' }}>
          <div style={{ fontSize:13, color:'var(--hint)', marginBottom:8 }}>
            Установить вручную
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <input type="number" inputMode="decimal" placeholder="напр. 3.2000"
              value={manualRate} onChange={e => setManualRate(e.target.value)}
              style={{ flex:1, padding:'11px 14px' }} />
            <Btn onClick={saveManualRate}
              disabled={!manualRate}
              style={{ flex:0, padding:'11px 20px', width:'auto' }}>
              OK
            </Btn>
          </div>
        </div>
      </Section>

      <Section title="О приложении">
        <Row label="Версия"      value="3.0.0" />
        <Row label="База данных" value="PostgreSQL (Neon)" />
        <Row label="Хостинг"    value="Render + CF Pages" />
      </Section>
    </div>
  );
}
