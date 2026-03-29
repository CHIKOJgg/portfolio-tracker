const MOCK = { id: 99999999, first_name: 'Developer', username: 'dev' };
export function useTelegram() {
  const tg = window?.Telegram?.WebApp;
  return {
    tg,
    user:     tg?.initDataUnsafe?.user || MOCK,
    initData: tg?.initData || '',
    isReal:   !!tg?.initData,
    ready:    ()    => tg?.ready(),
    expand:   ()    => tg?.expand(),
    haptic:   (t='light') => tg?.HapticFeedback?.impactOccurred(t),
    confirm:  (msg) => new Promise(r => tg ? tg.showConfirm(msg, r) : r(window.confirm(msg))),
  };
}
