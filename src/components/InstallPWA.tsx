import React, { useState, useEffect } from 'react';
import { Button, Snackbar, Alert, Box, Typography, Paper } from '@mui/material';
import { Download, Share, Info } from 'lucide-react';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // OS 체크
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /Android/.test(ua);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // 안드로이드/크롬 설치 프롬프트 이벤트 리스너
    const handler = (e: any) => {
      console.log('✅ PWA 설치 프롬프트가 감지되었습니다.');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 이미 설치되어 있는지 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <Box sx={{ p: 1, textAlign: 'center' }}>
      {/* 1. 설치 가능한 상태일 때 (안드로이드/크롬) */}
      {showInstallButton && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Download size={18} />}
          onClick={handleInstallClick}
          fullWidth
          sx={{ borderRadius: '12px', py: 1.5, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)' }}
        >
          앱으로 설치하기 (원클릭)
        </Button>
      )}

      {/* 2. 안드로이드지만 설치 버튼이 아직 안 떴을 때 (안내 문구) */}
      {isAndroid && !showInstallButton && !window.matchMedia('(display-mode: standalone)').matches && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default', borderStyle: 'dashed' }}>
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <Info size={20} color="#666" />
            <Typography variant="body2" color="text.secondary">
              브라우저 메뉴에서 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 선택해 주세요. 
              (잠시 후 버튼이 나타날 수도 있습니다.)
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* 3. iOS (Safari) 안내 */}
      {isIOS && !window.matchMedia('(display-mode: standalone)').matches && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Share size={18} />}
          onClick={() => setShowIOSHint(true)}
          fullWidth
          sx={{ borderRadius: '12px', py: 1.5, fontWeight: 'bold' }}
        >
          홈 화면에 추가 방법
        </Button>
      )}

      {/* 4. 이미 설치된 경우 */}
      {window.matchMedia('(display-mode: standalone)').matches && (
        <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
          ✅ 앱이 이미 설치되어 실행 중입니다.
        </Typography>
      )}

      <Snackbar
        open={showIOSHint}
        autoHideDuration={6000}
        onClose={() => setShowIOSHint(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowIOSHint(false)} severity="info" sx={{ width: '100%' }}>
          <Typography variant="body2">
            Safari 하단 <strong>'공유'</strong> 버튼 클릭 후, 
            <strong>'홈 화면에 추가'</strong>를 선택해 주세요!
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Stack 컴포넌트가 InstallPWA.tsx에 임포트되지 않았을 수 있으므로 Box로 대체하거나 임포트 추가
import { Stack } from '@mui/material';

export default InstallPWA;
