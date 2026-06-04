import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// 서비스 워커 강제 제거 (인증 꼬임 방지)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    );
  } catch (error) {
    console.error("Critical rendering error:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">앱 로딩 실패. 다시 시도해 주세요.</div>`;
  }
}
