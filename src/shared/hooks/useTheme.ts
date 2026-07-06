import { create } from 'zustand';
import type { ThemePref } from '@/domain/types';

const STORAGE_KEY = 'travelos-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'auto') return media.matches ? 'dark' : 'light';
  return pref;
}

function apply(pref: ThemePref) {
  document.documentElement.dataset.theme = resolve(pref);
}

interface ThemeState {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
}

export const useTheme = create<ThemeState>((set) => {
  const initial = (localStorage.getItem(STORAGE_KEY) as ThemePref) || 'auto';
  apply(initial);

  media.addEventListener('change', () => {
    const pref = (localStorage.getItem(STORAGE_KEY) as ThemePref) || 'auto';
    if (pref === 'auto') apply(pref);
  });

  return {
    pref: initial,
    setPref: (pref) => {
      localStorage.setItem(STORAGE_KEY, pref);
      apply(pref);
      set({ pref });
    },
  };
});
