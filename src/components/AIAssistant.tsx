import React, { useState, useRef, useEffect } from 'react';
import { 
  Fab, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box, 
  Stack, 
  Button, 
  CircularProgress,
  Divider,
  Avatar,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { 
  Sparkles, 
  X, 
  ChefHat, 
  TrendingUp, 
  Camera, 
  Bot,
  User,
  Settings as SettingsIcon,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../utils/aiService';
import { useFridgeStore } from '../store/useFridgeStore';
import { useLedgerStore } from '../store/useLedgerStore';
import ReactMarkdown from 'react-markdown';
import MealPlanner from './MealPlanner';

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'meal-plan'>('chat');
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', content: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { items } = useFridgeStore();
  const { expenses } = useLedgerStore();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  // Listen for global open event
  useEffect(() => {
    const handleOpenMealPlan = () => {
      setMode('meal-plan');
      setOpen(true);
    };
    window.addEventListener('open-ai-meal-plan', handleOpenMealPlan);
    return () => window.removeEventListener('open-ai-meal-plan', handleOpenMealPlan);
  }, []);

  const handleRecipeChef = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: '냉장고 재료로 요리 추천해줘!' }]);
    try {
      const response = await aiService.getRecipeChef(items);
      setMessages(prev => [...prev, { role: 'ai', content: response || '추천 결과가 없습니다.' }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `에러: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseAnalysis = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: '지출 내역 분석해줘!' }]);
    try {
      const response = await aiService.getExpenseAnalysis(expenses);
      setMessages(prev => [...prev, { role: 'ai', content: response || '분석 결과가 없습니다.' }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `에러: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length > 0 && confirm('대화 내용을 모두 초기화할까요?')) {
      setMessages([]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: '영수증 사진을 보냈어 (분석 중...)' }]);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      try {
        const response = await aiService.parseReceipt(base64data, true);
        setMessages(prev => [...prev, { role: 'ai', content: response || '분석 결과가 없습니다.' }]);
        
        try {
          const jsonMatch = response?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.items && Array.isArray(data.items)) {
              for (const item of data.items) {
                const firstComp = useFridgeStore.getState().compartments[0];
                if (firstComp) {
                  useFridgeStore.getState().addItem({
                    name: item.name,
                    quantity: item.quantity || 1,
                    unit: item.unit || '개',
                    category: '기타',
                    compartmentId: firstComp.id,
                  });
                }
              }
              setMessages(prev => [...prev, { role: 'ai', content: `✅ ${data.items.length}개의 품목을 냉장고에 추가했습니다!` }]);
            }
            if (data.totalAmount) {
              useLedgerStore.getState().addExpense({
                amount: data.totalAmount,
                category: '식비',
                comment: `${data.storeName || '영수증'} 자동 입력`,
                date: data.date || new Date().toISOString().split('T')[0],
              });
              setMessages(prev => [...prev, { role: 'ai', content: `✅ ${data.totalAmount.toLocaleString()}원을 가계부에 기록했습니다!` }]);
            }
          }
        } catch (e) {
          console.error("Failed to parse AI JSON response", e);
        }
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'ai', content: `에러: ${err.message}` }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Tooltip title="AI 어시스턴트" placement="left">
        <Fab 
          color="primary" 
          aria-label="ai-assistant"
          onClick={() => setOpen(true)}
          sx={{ 
            position: 'fixed', 
            bottom: { xs: 90, md: 32 }, 
            right: { xs: 16, md: 32 },
            zIndex: 1200,
            width: { xs: 48, md: 56 },
            height: { xs: 48, md: 56 },
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '&:hover': {
              transform: 'scale(1.1) rotate(10deg)',
            }
          }}
        >
          <Sparkles color="white" size={24} />
        </Fab>
      </Tooltip>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{ 
          '& .MuiPaper-root': { borderRadius: 4, height: '85vh', display: 'flex', flexDirection: 'column' },
          WebkitTouchCallout: 'none'
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, pt: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Sparkles size={20} color="#6366f1" />
            <Typography variant="body1" sx={{ fontWeight: 900 }}>AI 어시스턴트</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={handleClearChat} title="대화 초기화">
              <RotateCcw size={18} />
            </IconButton>
            <IconButton size="small" onClick={() => { setOpen(false); navigate('/settings'); }}>
              <SettingsIcon size={18} />
            </IconButton>
            <IconButton size="small" onClick={() => setOpen(false)}>
              <X size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <Box sx={{ px: 1.5, pb: 0.5 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, val) => val && setMode(val)}
            size="small"
            fullWidth
            sx={{ 
              bgcolor: '#f1f5f9', 
              p: 0.3, 
              borderRadius: 2,
              '& .MuiToggleButton-root': { border: 'none', borderRadius: 1.5, fontWeight: 800, fontSize: '0.75rem', py: 0.5 }
            }}
          >
            <ToggleButton value="chat" sx={{ gap: 0.5 }}>
              <Bot size={14} /> 대화
            </ToggleButton>
            <ToggleButton value="meal-plan" sx={{ gap: 0.5 }}>
              <Calendar size={14} /> 식단추천
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 1, bgcolor: '#f8fafc' }}>
          {mode === 'chat' ? (
            <>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Bot size={40} color="#6366f1" style={{ marginBottom: 8, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ fontWeight: 800 }} color="text.secondary">
                    무엇을 도와드릴까요?
                  </Typography>
                </Box>
              )}

              <Stack spacing={0.5}>
                {messages.map((msg, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '92%',
                      display: 'flex',
                      gap: 0.5,
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Avatar sx={{ width: 18, height: 18, bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main', flexShrink: 0, fontSize: '0.6rem' }}>
                      {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                    </Avatar>
                    <Box sx={{ 
                      p: '3px 8px', 
                      borderRadius: msg.role === 'user' ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      width: 'fit-content',
                      display: 'block',
                      minHeight: 0,
                      '& p': { m: 0, p: 0, fontSize: '0.75rem', lineHeight: 1.3 },
                      '& div': { m: 0, p: 0, fontSize: '0.75rem', lineHeight: 1.3 },
                      '& ul, & ol': { pl: 1.5, m: 0, p: 0 },
                      '& li': { fontSize: '0.72rem', lineHeight: 1.3, m: 0, p: 0 }
                    }}>
                      {msg.role === 'user' ? (
                        <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.3, whiteSpace: 'pre-wrap', m: 0, p: 0 }}>
                          {msg.content.trim()}
                        </Typography>
                      ) : (
                        <ReactMarkdown components={{ 
                          p: ({node, ...props}: any) => <span style={{display: 'block', margin: 0, padding: 0, lineHeight: 1.3}} {...props} />,
                          ul: ({node, ...props}: any) => <ul style={{margin: 0, padding: '0 0 0 16px'}} {...props} />,
                          ol: ({node, ...props}: any) => <ol style={{margin: 0, padding: '0 0 0 16px'}} {...props} />,
                          li: ({node, ...props}: any) => <li style={{margin: 0, padding: 0}} {...props} />
                        }}>
                          {msg.content.trim()}
                        </ReactMarkdown>
                      )}
                    </Box>
                  </Box>
                ))}
                {loading && (
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
                    <Avatar sx={{ width: 18, height: 18, bgcolor: 'secondary.main' }}>
                      <Bot size={10} />
                    </Avatar>
                    <Box sx={{ p: '4px 8px', borderRadius: '2px 10px 10px 10px', bgcolor: 'white', display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={12} thickness={5} />
                    </Box>
                  </Box>
                )}
                <div ref={chatEndRef} style={{ height: 5 }} />
              </Stack>
            </>
          ) : (
            <MealPlanner />
          )}
        </DialogContent>

        {mode === 'chat' && (
          <Box sx={{ p: 1, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
            <Stack direction="row" spacing={0.8} sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<ChefHat size={14} />} 
                onClick={handleRecipeChef}
                disabled={loading}
                sx={{ borderRadius: 15, flexShrink: 0, fontWeight: 700, fontSize: '0.7rem', py: 0.2 }}
              >
                레시피 쉐프
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<TrendingUp size={14} />} 
                onClick={handleExpenseAnalysis}
                disabled={loading}
                sx={{ borderRadius: 15, flexShrink: 0, fontWeight: 700, fontSize: '0.7rem', py: 0.2 }}
              >
                지출 분석
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<Camera size={14} />} 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                sx={{ borderRadius: 15, flexShrink: 0, fontWeight: 700, fontSize: '0.7rem', py: 0.2 }}
              >
                영수증 촬영
              </Button>
            </Stack>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
          </Box>
        )}
      </Dialog>
    </>
  );
};

export default AIAssistant;
