import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import { useTelegram } from './hooks/useTelegram.js';
import { setInitData, api } from './api/client.js';
import TabBar     from './components/TabBar.jsx';
import Dashboard  from './pages/Dashboard.jsx';
import CashPage   from './pages/CashPage.jsx';
import BondsPage  from './pages/BondsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function Loader() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', height:'100vh', gap:16, background:'var(--bg)' }}>
      <div className="spinner" style={{ width:36, height:36 }} />
      <span style={{ color:'var(--hint)', fontSize:14 }}>Подключение...</span>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', height:'100vh', padding:32,
                  textAlign:'center', gap:12, background:'var(--bg)' }}>
      <div style={{ fontSize:48 }}>⚠️</div>
      <div style={{ fontSize:18, fontWeight:700 }}>Нет подключения</div>
      <div style={{ fontSize:13, color:'var(--hint)', lineHeight:1.6, maxWidth:280 }}>{msg}</div>
      <div style={{ fontSize:12, color:'var(--hint)', marginTop:4 }}>
        Убедитесь что бэкенд запущен:<br/>
        <code style={{ background:'var(--bg2)', padding:'2px 8px',
                       borderRadius:4, fontFamily:'monospace' }}>npm run dev</code>
      </div>
      <button className="btn btn-primary" style={{ marginTop:8, maxWidth:220 }} onClick={onRetry}>
        Повторить
      </button>
    </div>
  );
}

function AppShell() {
  const { initData, ready, expand } = useTelegram();
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');

  async function init() {
    setStatus('loading');
    try {
      ready?.();
      expand?.();
      setInitData(initData);
      await api.auth.validate(initData);
      setStatus('ok');
    } catch (e) {
      setErrMsg(e.message);
      setStatus('error');
    }
  }

  useEffect(() => { init(); }, []);

  if (status === 'loading') return <Loader />;
  if (status === 'error')   return <ErrorScreen msg={errMsg} onRetry={init} />;

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div style={{ flex:1, overflowY:'auto',
                    paddingBottom:'calc(56px + var(--safe-bottom))' }}>
        <Routes>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/cash/*"     element={<CashPage />} />
          <Route path="/bonds/*"    element={<BondsPage />} />
          <Route path="/settings/*" element={<SettingsPage />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter future={{ v7_startTransition:true, v7_relativeSplatPath:true }}>
          <AppShell />
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  );
}
