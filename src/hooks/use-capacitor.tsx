
'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export function useCapacitor() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());

    if (Capacitor.isNativePlatform()) {
      // Status bar styling
      StatusBar.setStyle({ style: Style.Default });
      
      // Keyboard handling
      Keyboard.addListener('keyboardWillShow', info => {
        document.body.style.transform = `translateY(-${info.keyboardHeight}px)`;
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.transform = 'translateY(0px)';
      });
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners();
      }
    };
  }, []);

  return { isNative };
}
