import React, { useState } from 'react';
import { Field, Btn } from './UI.jsx';
import { today, fmt } from '../utils/calc.js';

export default function TransactionForm({ type, initial, onSubmit, onCancel, currentRate }) {
  const isBond = type === 'bond';
  const [form, setForm] = useState({
    date:      initial?.date?.split('T')[0] || today(),
    quantity:  initial?.quantity  != null ? String(initial.quantity)  : '',
    price_byn: initial?.price_byn != null ? String(initial.price_byn) : '',
    rate_usd:  initial?.rate_usd  != null ? String(initial.rate_usd)  : '',
    notes:     initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(''); };

  const qty   = parseFloat(form.quantity)  || 0;
  const price = parseFloat(form.price_byn) || 0;
  const rate  = parseFloat(form.rate_usd)  || 0;

  const totalByn   = qty > 0 && price > 0 ? qty * price : null;
  const previewTwx = !isBond && price > 0      ? price
                   :  isBond && rate > 0        ? price / rate
                   :  null;

  async function submit() {
    if (!form.date)  return setErr('Укажите дату');
    if (qty  <= 0)   return setErr('Укажите количество');
    if (price <= 0)  return setErr('Укажите цену');
    setSaving(true);
    try {
      await onSubmit({
        date: form.date, quantity: qty, price_byn: price,
        rate_usd: rate || null, notes: form.notes || null,
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="page-gap fade-in">
      <Field label="Дата">
        <input type="date" value={form.date}
          onChange={e => set('date', e.target.value)} />
      </Field>

      <Field label={isBond ? 'Количество облигаций' : 'Количество USD'}>
        <input type="number" inputMode="decimal"
          placeholder={isBond ? '3' : '190'}
          value={form.quantity}
          onChange={e => set('quantity', e.target.value)} />
      </Field>

      <Field
        label={isBond ? 'Цена одной облигации (BYN)' : 'Курс покупки (BYN / USD)'}
        hint={!isBond && currentRate ? `Курс НБРБ: ${(+currentRate).toFixed(4)} BYN` : undefined}
      >
        <input type="number" inputMode="decimal"
          placeholder={isBond ? '504.00' : '3.0000'}
          value={form.price_byn}
          onChange={e => set('price_byn', e.target.value)} />
      </Field>

      {isBond && (
        <Field
          label="Курс USD/BYN при покупке (опционально)"
          hint="Без него используется USD-эквивалент номинала из параметров выпуска"
        >
          <input type="number" inputMode="decimal"
            placeholder="2.8508"
            value={form.rate_usd}
            onChange={e => set('rate_usd', e.target.value)} />
        </Field>
      )}

      <Field label="Комментарий (опционально)">
        <input placeholder="заметка" maxLength={300}
          value={form.notes}
          onChange={e => set('notes', e.target.value)} />
      </Field>

      {/* Live preview */}
      {(totalByn !== null || previewTwx !== null) && (
        <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)',
                      padding:'12px 16px', display:'flex', gap:24 }}>
          {totalByn !== null && (
            <div>
              <div style={{ fontSize:11, color:'var(--hint)' }}>Итого BYN</div>
              <div style={{ fontWeight:700, fontSize:18 }}>
                {totalByn.toLocaleString('ru-RU', { maximumFractionDigits:2 })}
              </div>
            </div>
          )}
          {previewTwx !== null && (
            <div>
              <div style={{ fontSize:11, color:'var(--hint)' }}>TWX этой сделки</div>
              <div style={{ fontWeight:700, fontSize:18, color:'var(--btn)' }}>
                {previewTwx.toFixed(4)}
              </div>
            </div>
          )}
        </div>
      )}

      {err && (
        <div style={{ color:'var(--red)', fontSize:14, textAlign:'center' }}>{err}</div>
      )}

      <div style={{ display:'flex', gap:10 }}>
        <Btn variant="secondary" onClick={onCancel} disabled={saving} style={{ flex:1 }}>
          Отмена
        </Btn>
        <Btn onClick={submit} disabled={saving} style={{ flex:2 }}>
          {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Добавить'}
        </Btn>
      </div>
    </div>
  );
}
