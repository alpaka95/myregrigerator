import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  TextField, 
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Paper
} from '@mui/material';
import { 
  Copy, 
  UserPlus, 
  Check, 
  LogOut,
  Share2,
  Send,
  Globe,
  MessageCircle,
  Link as LinkIcon,
  Sparkles
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose }) => {
  const { profile, user, signOut, setProfile } = useAuthStore();
  const [currentHouseholdCode, setCurrentHouseholdCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [appCopied, setAppCopied] = useState(false);

  useEffect(() => {
    if (open && profile?.householdId) {
      const fetchHousehold = async () => {
        const hDoc = await getDoc(doc(db, 'households', profile.householdId!));
        if (hDoc.exists()) {
          setCurrentHouseholdCode(hDoc.data().inviteCode);
        }
      };
      fetchHousehold();
    }
  }, [open, profile?.householdId]);

  const handleJoin = async () => {
    if (!joinCode || !user) return;
    setError(null);
    setSuccess(null);
    try {
      const q = query(collection(db, 'households'), where('inviteCode', '==', joinCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('유효하지 않은 초대 코드입니다.');
        return;
      }

      const foundHousehold = querySnapshot.docs[0];
      const householdId = foundHousehold.id;

      // Update household members
      await updateDoc(doc(db, 'households', householdId), {
        members: arrayUnion(user.uid)
      });

      // Update user profile
      await updateDoc(doc(db, 'users', user.uid), {
        householdId: householdId
      });

      setSuccess('냉장고 공유에 성공했습니다!');
      // Update local profile state to trigger re-sync
      setProfile({ ...profile!, householdId });
      setJoinCode('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentHouseholdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAppLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setAppCopied(true);
    setTimeout(() => setAppCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '우리집 냉장고 - 스마트 냉장고 관리',
          text: '냉장고 식재료 관리와 식단표, 가계부까지 한 번에! 우리집 냉장고 앱을 사용해보세요.',
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      copyAppLink();
    }
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent('냉장고 식재료 관리와 식단표, 가계부까지 한 번에! #우리집냉장고 #스마트라이프');
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="xs"
      sx={{ '& .MuiPaper-root': { borderRadius: 4 } }}
    >
      <DialogTitle sx={{ fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Share2 size={24} color="#6366f1" /> 공유 및 설정
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 3, 
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: 'white'
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Sparkles size={16} />
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>친구에게 앱 추천하기</Typography>
            </Stack>
            <Typography variant="caption" sx={{ display: 'block', mb: 2, opacity: 0.9 }}>
              우리집 냉장고 앱을 SNS에 공유하고 더 편한 생활을 시작해보세요!
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button 
                variant="contained" 
                size="small" 
                fullWidth
                startIcon={<Share2 size={16} />}
                onClick={handleNativeShare}
                sx={{ bgcolor: 'white', color: '#6366f1', '&:hover': { bgcolor: '#f1f5f9' }, fontWeight: 800, borderRadius: 2 }}
              >
                공유하기
              </Button>
              <Tooltip title={appCopied ? "복사됨!" : "링크 복사"}>
                <IconButton onClick={copyAppLink} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
                  {appCopied ? <Check size={20} /> : <LinkIcon size={20} />}
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'center' }}>
              <IconButton onClick={shareOnTwitter} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }} title="Twitter에 공유"><Send size={16} /></IconButton>
              <IconButton onClick={shareOnFacebook} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }} title="Facebook에 공유"><Globe size={16} /></IconButton>
            </Stack>
          </Paper>

          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <UserPlus size={16} /> 가족 초대 코드
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            bgcolor: '#f8fafc', 
            p: 1.5, 
            borderRadius: 2.5,
            border: '1px solid #e2e8f0',
            mb: 3
          }}>
            <Typography variant="h5" sx={{ flex: 1, letterSpacing: 4, fontWeight: 900, fontFamily: 'monospace', color: 'primary.main' }}>
              {currentHouseholdCode || '...'}
            </Typography>
            <Tooltip title={copied ? "복사됨!" : "복사"}>
              <IconButton onClick={copyToClipboard} color={copied ? "success" : "primary"} sx={{ bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </IconButton>
            </Tooltip>
          </Box>

          <Divider sx={{ mb: 3 }}>다른 냉장고에 참여하기</Divider>

          {error && <Alert severity="error" sx={{ mb: 2, py: 0, borderRadius: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, py: 0, borderRadius: 2 }}>{success}</Alert>}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="초대 코드 입력"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              sx={{ 
                '& .MuiInputBase-root': { borderRadius: 2, bgcolor: '#f8fafc' },
                '& .MuiInputBase-input': { textTransform: 'uppercase', fontWeight: 800 } 
              }}
            />
            <Button 
              variant="contained" 
              onClick={handleJoin}
              startIcon={<UserPlus size={16} />}
              sx={{ minWidth: 80, borderRadius: 2, fontWeight: 800 }}
            >
              참여
            </Button>
          </Box>

          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontWeight: 600 }}>
              계정: {user?.email}
            </Typography>
            <Button 
              fullWidth 
              variant="outlined" 
              color="error" 
              startIcon={<LogOut size={16} />}
              onClick={() => { signOut(); onClose(); }}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              로그아웃
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ fontWeight: 800 }}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
