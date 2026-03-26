import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface AccessibilityState {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
  setHighContrast: (on: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityState | null>(null);

const fontSizeClasses: Record<string, string> = {
  normal: 'text-base',
  large: 'text-lg',
  xlarge: 'text-xl',
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const [fontSize, setFontSizeState] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [highContrast, setHighContrastState] = useState(false);

  useEffect(() => {
    if (profile) {
      setFontSizeState(profile.font_size);
      setHighContrastState(profile.high_contrast);
    }
  }, [profile]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-base', 'text-lg', 'text-xl');
    root.classList.add(fontSizeClasses[fontSize]);
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [fontSize, highContrast]);

  const setFontSize = (size: 'normal' | 'large' | 'xlarge') => {
    setFontSizeState(size);
    if (user) {
      supabase.from('user_profiles').update({ font_size: size }).eq('id', user.id).then(() => {});
    }
  };

  const setHighContrast = (on: boolean) => {
    setHighContrastState(on);
    if (user) {
      supabase.from('user_profiles').update({ high_contrast: on }).eq('id', user.id).then(() => {});
    }
  };

  return (
    <AccessibilityContext.Provider value={{ fontSize, highContrast, setFontSize, setHighContrast }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
