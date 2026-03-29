import React from 'react';

export function Spinner({ size = 28 }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
      <div className="spinner" style={{ width:size, height:size }} />
    </div>
  );
}

export function Section({ title, action, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {(title || action) && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 2px' }}>
          {title && <span className="section-label">{title}</span>}
          {action}
        </div>
      )}
      <div className="card">{children}</div>
    </div>
  );
}

export function Row({ label, value, sub, onClick, chevron, valueClass }) {
  return (
    <div className="row" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <span className="row-label">{label}</span>
      <div className="row-right">
        <span className={`row-value ${valueClass||''}`}>{value}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </div>
      {chevron && <span style={{ color:'var(--hint)', marginLeft:6, fontSize:18 }}>›</span>}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint  && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function Btn({ variant='primary', children, style:s, ...rest }) {
  return (
    <button className={`btn btn-${variant}`} style={s} {...rest}>
      {children}
    </button>
  );
}

export function PlusFab({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background:'var(--btn)', color:'var(--btn-text)',
      width:36, height:36, borderRadius:18, fontSize:22,
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow:'0 2px 8px rgba(0,0,0,0.3)', flexShrink:0,
    }}>+</button>
  );
}

export function PageHeader({ title, action, onBack }) {
  return (
    <div className="page-header">
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {onBack && <button className="back-btn" onClick={onBack}>‹</button>}
        <h1 style={{ fontSize:22, fontWeight:700 }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function TwxChips({ avg, min, max }) {
  return (
    <div className="twx-row">
      <div className="twx-chip">
        <span className="twx-chip-label">MIN</span>
        <span className="twx-chip-value pos">{min != null ? (+min).toFixed(4) : '—'}</span>
      </div>
      <div className="twx-chip" style={{ flex:1 }}>
        <span className="twx-chip-label">AVG TWX</span>
        <span className="twx-chip-value" style={{ fontSize:20, color:'var(--btn)' }}>
          {avg != null ? (+avg).toFixed(4) : '—'}
        </span>
      </div>
      <div className="twx-chip">
        <span className="twx-chip-label">MAX</span>
        <span className="twx-chip-value neg">{max != null ? (+max).toFixed(4) : '—'}</span>
      </div>
    </div>
  );
}

export function EmptyState({ icon='📭', title, sub }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  );
}
