import React, { createContext, useContext, useState, useCallback } from 'react';
const Ctx = createContext(null);
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const show = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setList(l => [...l, { id, msg, type }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), 2400);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div style={{
        position: 'fixed', bottom: 'calc(72px + var(--safe-bottom))',
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'center', zIndex: 300, pointerEvents: 'none',
      }}>
        {list.map(({ id, msg, type }) => (
          <div key={id} style={{
            background: type === 'error' ? '#c62828' : 'var(--bg4)',
            color: '#fff', padding: '10px 20px', borderRadius: 20,
            fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease',
          }}>{msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
