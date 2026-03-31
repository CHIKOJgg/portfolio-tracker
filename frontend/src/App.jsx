import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import { useTelegram } from './hooks/useTelegram.js';
import { setInitData, api } from './api/client.js';
import TabBar       from './components/TabBar.jsx';
import Dashboard    from './pages/Dashboard.jsx';
import CashPage     from './pages/CashPage.jsx';
import BondsPage    from './pages/BondsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function Loader() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', height:'100vh', gap:16 }}>
      <div className="spinner" style={{ width:36, height:36 }} />
      <span style={{ color:'var(--hint)', fontSize:14 }}>Подключение...</span>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', height:'100vh', padding:32,
                  textAlign:'center', gap:12 }}>
      <div style={{ fontSize:48 }}>⚠️</div>
      <div style={{ fontSize:18, fontWeight:700 }}>Ошибка подключения</div>
      <div style={{ fontSize:13, color:'var(--hint)', lineHeight:1.6, maxWidth:300 }}>{msg}</div>
      <button className="btn btn-primary" style={{ marginTop:8, maxWidth:220 }} onClick={onRetry}>
        Повторить
      </button>
    </div>
  );
}

function AppShell() {
  const { tg, initData, ready, expand } = useTelegram();
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');

  async function init() {
    setStatus('loading');
    try {
      // 1. Tell Telegram the app is ready and expand to full screen
      ready?.();
      expand?.();

      // 2. Get the REAL initData from Telegram WebApp
      // This is the key — we use tg.initData directly, not from hook
      const telegramInitData = tg?.initData || initData || '';

      // 3. Store it for all subsequent API calls
      setInitData(telegramInitData);

      // 4. Authenticate with backend
      await api.auth.validate(telegramInitData);

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