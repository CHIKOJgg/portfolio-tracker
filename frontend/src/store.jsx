import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { api } from './api/client.js';
import { readCache, writeCache } from './utils/calc.js';

const Ctx  = createContext(null);
const init = {
  summary: readCache(),   // pre-populate from cache for instant render
  cashTxs: null, bondTxs: null, bondParams: null,
  currentRate: null, loading: false, error: null, isOffline: false,
};

function reducer(s, a) {
  switch (a.type) {
    case 'LOADING':     return { ...s, loading: a.v };
    case 'ERROR':       return { ...s, error: a.v, loading: false };
    case 'SUMMARY':     return { ...s, summary: a.v, loading: false, error: null, isOffline: false,
                                  currentRate: a.v.currentRate ?? s.currentRate };
    case 'CASH_TXS':    return { ...s, cashTxs:    a.v };
    case 'BOND_TXS':    return { ...s, bondTxs:    a.v };
    case 'BOND_PARAMS': return { ...s, bondParams:  a.v };
    case 'RATE':        return { ...s, currentRate: a.v };
    case 'OFFLINE':     return { ...s, isOffline: true, loading: false };
    default:            return s;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);

  const loadSummary = useCallback(async () => {
    dispatch({ type: 'LOADING', v: true });
    try {
      const data = await api.portfolio.summary();
      writeCache(data);
      dispatch({ type: 'SUMMARY', v: data });
    } catch (e) {
      // If we have cached data, stay usable offline
      if (state.summary) {
        dispatch({ type: 'OFFLINE' });
      } else {
        dispatch({ type: 'ERROR', v: e.message });
      }
    }
  }, [state.summary]);

  const loadCashTxs = useCallback(async () => {
    const v = await api.transactions.list('cash_usd');
    dispatch({ type: 'CASH_TXS', v });
    return v;
  }, []);

  const loadBondTxs = useCallback(async () => {
    const v = await api.transactions.list('bond');
    dispatch({ type: 'BOND_TXS', v });
    return v;
  }, []);

  const loadBondParams = useCallback(async () => {
    const v = await api.bonds.getParams();
    dispatch({ type: 'BOND_PARAMS', v });
    return v;
  }, []);

  const loadRate = useCallback(async () => {
    const { rate } = await api.rates.current();
    dispatch({ type: 'RATE', v: rate });
    return rate;
  }, []);

  return (
    <Ctx.Provider value={{ state, dispatch, loadSummary, loadCashTxs, loadBondTxs, loadBondParams, loadRate }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);
