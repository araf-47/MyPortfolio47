import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'theme';

  readonly theme = signal<Theme>(this.getInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      const current = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', current);
        document.documentElement.setAttribute('data-bs-theme', current);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
          meta.setAttribute('content', current === 'dark' ? '#0E0E10' : '#F5F0E6');
        }
      }
      try {
        localStorage.setItem(this.storageKey, current);
      } catch {
        /* ignore storage errors (e.g. private mode) */
      }
    });
  }

  toggle(): void {
    this.theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private getInitialTheme(): Theme {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      /* ignore */
    }
    // First-time visitors always start in light mode per product decision.
    return 'light';
  }
}