import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './fonts.css';
import './styles.css';

type WeChatFontEvent = { fontSize?: number | string; fontScale?: number | string };
type WeChatBridge = {
  invoke: (method: string, payload: Record<string, string>) => void;
  on: (event: string, callback: (payload: WeChatFontEvent) => void) => void;
};

declare global {
  interface Window { WeixinJSBridge?: WeChatBridge }
}

function enableWeChatFontAdaptation() {
  if (!/android/i.test(navigator.userAgent)) return;
  const bridge = window.WeixinJSBridge;
  if (!bridge) return;

  const root = document.documentElement;
  root.dataset.wechatFontAdaptation = 'enabled';
  bridge.invoke('setFontSizeCallback', { fontSize: '2' });
  bridge.on('menu:setfont', ({ fontSize, fontScale }) => {
    const scale = Number(fontScale);
    const level = Number(fontSize);
    const fallback = [0, 0.9, 1, 1.12, 1.25, 1.4, 1.6, 1.8, 2][level] ?? 1;
    const factor = Number.isFinite(scale) && scale > 0 ? scale : fallback;
    const safeFactor = Math.min(2.5, Math.max(0.85, factor));
    root.style.setProperty('--wechat-font-scale', String(safeFactor));
    root.style.setProperty('--wechat-heading-scale', String(Math.min(1.3, safeFactor)));
  });
}

if (window.WeixinJSBridge) {
  enableWeChatFontAdaptation();
} else {
  document.addEventListener('WeixinJSBridgeReady', enableWeChatFontAdaptation, { once: true });
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
