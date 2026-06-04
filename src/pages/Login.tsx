import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Divider,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { 
  signInWithRedirect,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import GoogleIcon from '@mui/icons-material/Google';
import RefrigeratorIcon from '@mui/icons-material/Kitchen';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      console.log("Starting Google Redirect Login...");
      // 꼬여있는 세션이 있을 수 있으므로 한 번 로그아웃 후 진행
      await signOut(auth);
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Login error:", err);
      setError("구글 로그인을 시작할 수 없습니다. 이메일 로그인을 이용해 보세요.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err.code);
      if (err.code === 'auth/invalid-credential') {
        setError('이메일 또는 비밀번호가 틀렸습니다.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.');
      } else if (err.code === 'auth/weak-password') {
        setError('비밀번호를 6자리 이상으로 설정해 주세요.');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ 
              p: 2, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefrigeratorIcon fontSize="large" />
            </Box>
          </Box>
          
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 900 }}>
            내 냉장고 관리
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            가장 확실한 방법으로 로그인하세요
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, textAlign: 'left', fontSize: '0.85rem' }}>{error}</Alert>}

          <form onSubmit={handleEmailAuth}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="이메일 주소"
                variant="filled"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="small"
              />
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                variant="filled"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size="small"
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 900, fontSize: '1rem' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : (isRegistering ? '계정 만들기' : '로그인')}
              </Button>
            </Stack>
          </form>

          <Button 
            fullWidth 
            sx={{ mt: 1, color: 'text.secondary' }} 
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 1초 회원가입'}
          </Button>

          <Divider sx={{ my: 3, color: 'text.disabled' }}>또는</Divider>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{ py: 1.2, borderRadius: 2, borderWeight: 2 }}
          >
            Google로 로그인 시도
          </Button>
          
          <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: 'block' }}>
            IDX 개발 환경에서는 구글 로그인이 원활하지 않을 수 있습니다.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
