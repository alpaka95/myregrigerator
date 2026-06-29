import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Snackbar, Button, IconButton, BottomNavigation, BottomNavigationAction, Paper, Stack, Typography } from '@mui/material';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { X, Refrigerator as FridgeIcon, ReceiptText, Settings as SettingsIcon, Utensils, Sparkles } from 'lucide-react';
import { theme } from './styles/theme';
import { auth } from './firebase';
import { useAuthStore } from './store/useAuthStore';
import { useFridgeStore } from './store/useFridgeStore';
import { useSyncHousehold } from './hooks/useSyncHousehold';
import Dashboard from './pages/Dashboard';
import CompartmentDetail from './pages/CompartmentDetail';
import Ledger from './pages/Ledger';
import Login from './pages/Login';
import Settings from './pages/Settings';
import MealPlan from './pages/MealPlan';
import AIChefPage from './pages/AIChef';

function App() {
  const { user, initialized, setUser, setLoading, setInitialized } = useAuthStore();
  const { lastDeletedItem, undoDelete } = useFridgeStore();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const location = useLocation();
  
  useSyncHousehold();

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Redirect success:", result.user.email);
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.error("Redirect Error:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth State:", firebaseUser ? "Logged In" : "Logged Out");
      setUser(firebaseUser);
      setInitialized(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setInitialized]);

  useEffect(() => {
    if (lastDeletedItem) {
      const timer = setTimeout(() => setSnackbarOpen(true), 0);
      return () => clearTimeout(timer);
    }
  }, [lastDeletedItem]);

  const handleUndo = () => {
    undoDelete();
    setSnackbarOpen(false);
  };

  if (!initialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f8fafc' }}>
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">서버 연결 중...</Typography>
          </Stack>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'hidden', p: { xs: 2, md: 4 }, pb: { xs: 12, md: 4 } }}>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ai-chef" element={<AIChefPage />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/meal-plan" element={<MealPlan />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/compartment/:type" element={<CompartmentDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Box>

      {user && (
        <>
          <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={3}>
            <BottomNavigation
              showLabels
              value={
                location.pathname === '/meal-plan' ? 2 :
                location.pathname === '/ai-chef' ? 1 :
                location.pathname === '/ledger' ? 3 :
                location.pathname === '/settings' ? 4 : 0
              }
              sx={{ height: 80, '& .MuiBottomNavigationAction-root': { color: 'text.secondary', minWidth: 0, px: 1 }, '& .Mui-selected': { color: 'primary.main' } }}
            >
              <BottomNavigationAction label="냉장고" icon={<FridgeIcon size={22} />} component={Link} to="/" />
              <BottomNavigationAction label="AI 셰프" icon={<Sparkles size={22} />} component={Link} to="/ai-chef" />
              <BottomNavigationAction label="식단" icon={<Utensils size={22} />} component={Link} to="/meal-plan" />
              <BottomNavigationAction label="가계부" icon={<ReceiptText size={22} />} component={Link} to="/ledger" />
              <BottomNavigationAction label="설정" icon={<SettingsIcon size={22} />} component={Link} to="/settings" />
            </BottomNavigation>
          </Paper>
        </>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={lastDeletedItem ? `${lastDeletedItem.name} 품목이 삭제되었습니다.` : ''}
        action={
          <>
            <Button color="secondary" size="small" onClick={handleUndo} sx={{ fontWeight: 800 }}>
              실행취소
            </Button>
            <IconButton size="small" aria-label="close" color="inherit" onClick={() => setSnackbarOpen(false)}>
              <X size={18} />
            </IconButton>
          </>
        }
        sx={{ bottom: { xs: 90, sm: 24 } }}
      />
    </ThemeProvider>
  );
}

export default App;
