import React, { useRef, useState } from 'react';
import { fmtDate, fmt } from '../utils/calc.js';
import { EmptyState } from './UI.jsx';

const ACTION_W = 150;

function SwipeRow({ tx, isBond, onEdit, onDelete }) {
  const [offset, setOffset] = useState(0);
  const startX  = useRef(null);
  const isOpen  = offset >= ACTION_W;

  const start = (x) => { startX.current = x; };
  const move  = (x) => {
    if (startX.current === null) return;
    setOffset(Math.max(0, Math.min(ACTION_W, startX.current - x)));
  };
  const end   = () => {
    setOffset(prev => (prev > ACTION_W / 2 ? ACTION_W : 0));
    startX.current = null;
  };

  const totalByn = +tx.quantity * +tx.price_byn;
  const mainLabel = isBond
    ? `${+tx.quantity === Math.floor(+tx.quantity) ? Math.floor(+tx.quantity) : +tx.quantity} шт.`
    : `${fmt(+tx.quantity, 2)} USD`;
  const rateLabel = isBond
    ? `${fmt(+tx.price_byn, 2)} BYN/шт`
    : `${(+tx.price_byn).toFixed(4)} BYN/USD`;

  return (
    <div className="swipe-wrapper">
      <div className="swipe-actions">
        <button className="swipe-action-btn"
          style={{ background:'var(--btn)' }}
          onClick={() => { setOffset(0); onEdit(tx); }}>
          Ред.
        </button>
        <button className="swipe-action-btn"
          style={{ background:'var(--red)' }}
          onClick={() => { setOffset(0); onDelete(tx.id); }}>
          Удал.
        </button>
      </div>

      <div
        className="swipe-content"
        style={{ transform:`translateX(-${offset}px)` }}
        onTouchStart={e => start(e.touches[0].clientX)}
        onTouchMove={e  => move(e.touches[0].clientX)}
        onTouchEnd={end}
        onClick={() => !isOpen && onEdit(tx)}
      >
        <div style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'center', padding:'12px 16px', cursor:'pointer' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:500 }}>{mainLabel}</div>
            <div style={{ fontSize:12, color:'var(--hint)', marginTop:2 }}>
              {fmtDate(tx.date)}{tx.notes ? ` · ${tx.notes}` : ''}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:15, fontWeight:600 }}>
              {totalByn.toLocaleString('ru-RU', { maximumFractionDigits:2 })} BYN
            </div>
            <div style={{ fontSize:12, color:'var(--hint)', marginTop:2 }}>{rateLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, isBond, onEdit, onDelete }) {
  if (!transactions?.length) {
    return (
      <EmptyState
        icon={isBond ? '📄' : '💵'}
        title="Нет операций"
        sub="Нажмите + чтобы добавить"
      />
    );
  }
  return (
    <div>
      {transactions.map(tx => (
        <SwipeRow key={tx.id} tx={tx} isBond={isBond}
          onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
