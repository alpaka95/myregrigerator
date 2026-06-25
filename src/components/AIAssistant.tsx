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
  TextField
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
  RotateCcw,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../utils/aiService';
import { useFridgeStore } from '../store/useFridgeStore';
import { useLedgerStore } from '../store/useLedgerStore';
import { useAIStore } from '../store/useAIStore';
import ReactMarkdown from 'react-markdown';

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const navigate = useNavigate();
  const { items } = useFridgeStore();
  const { expenses } = useLedgerStore();
  const { messages, addMessage, clearMessages } = useAIStore();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      addMessage({ role: 'ai', content: '⚠️ 사용자에 의해 요청이 취소되었습니다.' });
    }
  };

  const handleSendMessage = async (text?: string) => {
    const content = text || inputValue;
    if (!content.trim()) return;

    if (!text) setInputValue('');
    addMessage({ role: 'user', content });
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Pass history to AI service for context
      const response = await aiService.chat(content, messages, items, expenses, controller.signal);
      addMessage({ role: 'ai', content: response || '죄송합니다. 답변을 생성하지 못했습니다.' });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'AbortError') return;
      addMessage({ role: 'ai', content: `에러: ${err.message}` });
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleRecipeChef = async () => {
    setLoading(true);
    addMessage({ role: 'user', content: '냉장고 재료로 요리 추천해줘!' });
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const response = await aiService.getRecipeChef(items, controller.signal);
      addMessage({ role: 'ai', content: response || '추천 결과가 없습니다.' });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'AbortError') return;
      addMessage({ role: 'ai', content: `에러: ${err.message}` });
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleExpenseAnalysis = async () => {
    setLoading(true);
    addMessage({ role: 'user', content: '지출 내역 분석해줘!' });
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const response = await aiService.getExpenseAnalysis(expenses, controller.signal);
      addMessage({ role: 'ai', content: response || '분석 결과가 없습니다.' });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'AbortError') return;
      addMessage({ role: 'ai', content: `에러: ${err.message}` });
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleClearChat = () => {
    if (messages.length > 0 && confirm('대화 내용을 모두 초기화할까요?')) {
      clearMessages();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    addMessage({ role: 'user', content: '영수증 사진을 보냈어 (분석 중...)' });
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      try {
        const response = await aiService.parseReceipt(base64data, true, controller.signal);
        addMessage({ role: 'ai', content: response || '분석 결과가 없습니다.' });
        
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
              addMessage({ role: 'ai', content: `✅ ${data.items.length}개의 품목을 냉장고에 추가했습니다!` });
            }
            if (data.totalAmount) {
              useLedgerStore.getState().addExpense({
                amount: data.totalAmount,
                category: '식비',
                comment: `${data.storeName || '영수증'} 자동 입력`,
                date: data.date || new Date().toISOString().split('T')[0],
              });
              addMessage({ role: 'ai', content: `✅ ${data.totalAmount.toLocaleString()}원을 가계부에 기록했습니다!` });
            }
          }
        } catch (e) {
          console.error("Failed to parse AI JSON response", e);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === 'AbortError') return;
        addMessage({ role: 'ai', content: `에러: ${err.message}` });
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
          abortControllerRef.current = null;
        }
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
          '& .MuiPaper-root': { borderRadius: 4, height: '75vh', display: 'flex', flexDirection: 'column' },
          WebkitTouchCallout: 'none'
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, pt: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Sparkles size={18} color="#6366f1" />
            <Typography variant="body2" sx={{ fontWeight: 900 }}>AI 어시스턴트</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={handleClearChat} title="대화 초기화">
              <RotateCcw size={16} />
            </IconButton>
            <IconButton size="small" onClick={() => { setOpen(false); navigate('/settings'); }}>
              <SettingsIcon size={16} />
            </IconButton>
            <IconButton size="small" onClick={() => setOpen(false)}>
              <X size={16} />
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
              '& .MuiToggleButton-root': { border: 'none', borderRadius: 1.5, fontWeight: 800, fontSize: '0.7rem', py: 0.4 }
            }}
          >
            <ToggleButton value="chat" sx={{ gap: 0.5 }}>
              <Bot size={12} /> 대화
            </ToggleButton>
            <ToggleButton value="meal-plan" sx={{ gap: 0.5 }}>
              <Calendar size={12} /> 식단추천
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 1.5, bgcolor: '#f8fafc' }}>
          {mode === 'chat' ? (
            <>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Bot size={48} color="#6366f1" style={{ opacity: 0.2 }} />
                    <Sparkles size={20} color="#a855f7" style={{ position: 'absolute', top: -5, right: -5, opacity: 0.6 }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, mt: 1.5, color: 'text.secondary' }}>
                    냉장고 재료로 무엇을 만들까요?
                  </Typography>
                </Box>
              )}

              <Stack spacing={1}>
                {messages.map((msg, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      display: 'flex',
                      gap: 0.8,
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Avatar sx={{ width: 22, height: 22, bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main', flexShrink: 0, fontSize: '0.7rem' }}>
                      {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </Avatar>
                    <Box sx={{ 
                      p: '6px 12px', 
                      borderRadius: msg.role === 'user' ? '14px 2px 14px 14px' : '2px 14px 14px 14px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      border: msg.role === 'user' ? 'none' : '1px solid rgba(0,0,0,0.05)',
                      width: 'fit-content',
                      '& p': { m: 0, p: 0, fontSize: '0.78rem', lineHeight: 1.4 },
                      '& ul, & ol': { pl: 2, m: 0.5, p: 0 },
                      '& li': { fontSize: '0.75rem', lineHeight: 1.4, m: 0, p: 0 }
                    }}>
                      {msg.role === 'user' ? (
                        <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                          {msg.content.trim()}
                        </Typography>
                      ) : (
                        <ReactMarkdown components={{ 
                          p: ({node, ...props}: any) => <span style={{display: 'block', margin: 0, padding: 0}} {...props} />,
                          ul: ({node, ...props}: any) => <ul style={{margin: '4px 0', padding: '0 0 0 18px'}} {...props} />,
                          ol: ({node, ...props}: any) => <ol style={{margin: '4px 0', padding: '0 0 0 18px'}} {...props} />,
                          li: ({node, ...props}: any) => <li style={{margin: 2, padding: 0}} {...props} />
                        }}>
                          {msg.content.trim()}
                        </ReactMarkdown>
                      )}
                    </Box>
                  </Box>
                ))}
                {loading && (
                  <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-start' }}>
                    <Avatar sx={{ width: 22, height: 22, bgcolor: 'secondary.main' }}>
                      <Bot size={12} />
                    </Avatar>
                    <Box sx={{ p: '8px 12px', borderRadius: '2px 14px 14px 14px', bgcolor: 'white', display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <CircularProgress size={14} thickness={6} sx={{ color: '#6366f1' }} />
                      <Button 
                        size="small" 
                        onClick={handleCancel}
                        sx={{ 
                          minWidth: 0, p: '2px 8px', fontSize: '0.65rem', fontWeight: 800, 
                          color: 'error.main', border: '1px solid', borderColor: 'error.light', borderRadius: 1
                        }}
                      >
                        중단
                      </Button>
                    </Box>
                  </Box>
                )}
                <div ref={chatEndRef} style={{ height: 10 }} />
              </Stack>
            </>
          ) : (
            <MealPlanner />
          )}
        </DialogContent>

        {mode === 'chat' && (
          <Box sx={{ p: 1.2, bgcolor: 'white', borderTop: '1px solid #f1f5f9' }}>
            <Stack direction="row" spacing={0.6} sx={{ overflowX: 'auto', pb: 1, mb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<ChefHat size={12} />} 
                onClick={handleRecipeChef}
                disabled={loading}
                sx={{ 
                  borderRadius: 8, flexShrink: 0, fontWeight: 800, fontSize: '0.65rem', py: 0.4, px: 1.2,
                  bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #e0f2fe',
                  '&:hover': { bgcolor: '#e0f2fe' }
                }}
              >
                레시피 추천
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<TrendingUp size={12} />} 
                onClick={handleExpenseAnalysis}
                disabled={loading}
                sx={{ 
                  borderRadius: 8, flexShrink: 0, fontWeight: 800, fontSize: '0.65rem', py: 0.4, px: 1.2,
                  bgcolor: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7',
                  '&:hover': { bgcolor: '#dcfce7' }
                }}
              >
                지출 분석
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<Camera size={12} />} 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                sx={{ 
                  borderRadius: 8, flexShrink: 0, fontWeight: 800, fontSize: '0.65rem', py: 0.4, px: 1.2,
                  bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2',
                  '&:hover': { bgcolor: '#fee2e2' }
                }}
              >
                영수증 스캔
              </Button>
            </Stack>
            
            <Box 
              component="form" 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              sx={{ mt: 0.5 }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="궁금한 것을 물어보세요..."
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                disabled={loading}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <IconButton 
                        type="submit" 
                        sx={{ p: '4px', color: inputValue.trim() ? '#6366f1' : '#cbd5e1' }} 
                        disabled={loading || !inputValue.trim()}
                      >
                        <Send size={18} />
                      </IconButton>
                    )
                  }
                }}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    borderRadius: 1.5, 
                    bgcolor: 'white', 
                    fontSize: '0.75rem',
                    border: '1px solid #e2e8f0',
                    p: '8px 12px',
                    transition: 'all 0.2s',
                    '&:focus-within': {
                      borderColor: '#6366f1',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)'
                    }
                  },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              />
            </Box>

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
