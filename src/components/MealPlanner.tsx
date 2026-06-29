import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  Button, 
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Chip,
  TextField,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Sparkles, 
  ShoppingCart, 
  Calendar,
  Save,
  Archive,
  Info,
  ArrowRight,
  History as HistoryIcon
} from 'lucide-react';
import { aiService } from '../utils/aiService';
import { useFridgeStore } from '../store/useFridgeStore';
import { useAIStore } from '../store/useAIStore';
import type { MealPlanResponse } from '../types/index';

const generateHoldingId = () => `holding_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const MealPlanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [hasChild, setHasChild] = useState(false);
  const [useFridge, setUseFridge] = useState(false);
  const [schoolMealMode, setSchoolMealMode] = useState(false);
  const [customRequest, setCustomRequest] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<{ day: string, type: 'breakfast' | 'lunch' | 'dinner', menu: string, recipeLink: string }[]>([]);
  const [conflictData, setConflictData] = useState<{ day: string, type: 'breakfast' | 'lunch' | 'dinner', currentMenu: string, newMenu: string, recipeLink: string } | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  
  const { items, addShoppingItem, updateWeeklyMenu, weeklyMenu } = useFridgeStore();
  const { mealPlanHistory, addMealPlanToHistory } = useAIStore();

  React.useEffect(() => {
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
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await aiService.getWeeklyMealPlan(items, hasChild, useFridge, customRequest, schoolMealMode, controller.signal) as MealPlanResponse;
      if (response && response.plan) {
        setMealPlan(response);
        addMealPlanToHistory(response, response.requiredIngredients || []);
        setSelectedMenus([]); 
      } else {
        alert('식단을 짜는 데 실패했습니다. 다시 시도해 주세요.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('503') || errorMsg.includes('high demand')) {
        alert('🤖 AI 서버가 현재 매우 바쁩니다(503 오류).\n\n구글 AI 서버에 사용자가 몰려 일시적으로 응답이 지연되고 있습니다. 1~2분 뒤에 다시 시도해 주시면 감사하겠습니다!');
      } else {
        alert(`에러: ${errorMsg}`);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const toggleMenuSelection = (day: string, type: 'breakfast' | 'lunch' | 'dinner', menu: string, recipeLink: string) => {
    const isSelected = selectedMenus.find(m => m.day === day && m.type === type);
    
    if (isSelected) {
      setSelectedMenus(prev => prev.filter(m => !(m.day === day && m.type === type)));
      return;
    }

    const id = `${day}_${type}`;
    const currentMeal = weeklyMenu.find(m => m.id === id);

    if (currentMeal?.menu) {
      setConflictData({ day, type, currentMenu: currentMeal.menu, newMenu: menu, recipeLink });
    } else {
      setSelectedMenus(prev => [...prev, { day, type, menu, recipeLink }]);
    }
  };

  const handleResolveConflict = () => {
    if (conflictData) {
      setSelectedMenus(prev => [...prev, { 
        day: conflictData.day, 
        type: conflictData.type, 
        menu: conflictData.newMenu, 
        recipeLink: conflictData.recipeLink 
      }]);
      setConflictData(null);
    }
  };

  const handleSaveToWeekly = async () => {
    if (selectedMenus.length === 0) return alert('선택된 메뉴가 없습니다.');
    
    setLoading(true);
    try {
      for (const item of selectedMenus) {
        const id = `${item.day}_${item.type}`;
        await updateWeeklyMenu(id, item.menu, item.recipeLink);
      }
      alert('✅ 선택한 메뉴들이 "이번 주 식단"에 저장되었습니다!');
      setMealPlan(null);
    } catch {
      alert('저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToArchive = async (menu: string, link: string) => {
    try {
      const holdingId = generateHoldingId();
      await updateWeeklyMenu(holdingId, menu, link);
      alert('📦 보관함에 저장되었습니다!');
    } catch {
      alert('보관 실패');
    }
  };

  const handleAddShoppingItems = () => {
    if (!mealPlan) return;
    mealPlan.requiredIngredients.forEach(item => addShoppingItem(item));
    alert(`${mealPlan.requiredIngredients.length}개의 재료를 장보기 목록에 추가했습니다!`);
  };

  if (mealPlan && !loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
          gap: 2, 
          mt: 1 
        }}>
          {mealPlan.plan.map((day, idx) => (
            <Card key={idx} variant="outlined" sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'visible', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ bgcolor: '#f8fafc', py: 0.8, px: 2, borderBottom: '1px solid #e2e8f0', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.75rem', color: 'text.primary' }}>{day.day}</Typography>
                <Chip label={`${selectedMenus.filter(m => m.day === day.day).length}개 선택`} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: 'white' }} />
              </Box>
              <CardContent sx={{ p: 2, flexGrow: 1 }}>
                <Stack spacing={2}>
                  {(['breakfast', 'lunch', 'dinner'] as const).map(type => {
                    const recommended = day[type];
                    const isSelected = selectedMenus.find(m => m.day === day.day && m.type === type);
                    
                    return (
                      <Box key={type}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: type === 'breakfast' ? 'success.main' : type === 'lunch' ? 'primary.main' : 'error.main', fontSize: '0.7rem' }}>
                              {type === 'breakfast' ? '아침' : type === 'lunch' ? '점심' : '저녁'}
                            </Typography>
                            {recommended.reason && (
                              <Tooltip title={recommended.reason} arrow>
                                <Info size={14} color="#94a3b8" style={{ cursor: 'help' }} />
                              </Tooltip>
                            )}
                          </Stack>
                          <Button 
                            size="small" 
                            variant="text"
                            startIcon={<Archive size={12} />} 
                            onClick={() => handleSaveToArchive(recommended.menu, recommended.recipeLink)}
                            sx={{ fontSize: '0.65rem', py: 0, height: 20, minWidth: 0, color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}
                          >
                            보관함 저장
                          </Button>
                        </Stack>
                        
                        <Button 
                          fullWidth 
                          variant={isSelected ? "contained" : "outlined"}
                          onClick={() => toggleMenuSelection(day.day, type, recommended.menu, recommended.recipeLink)}
                          color={type === 'breakfast' ? 'success' : type === 'lunch' ? 'primary' : 'error'}
                          sx={{ 
                            justifyContent: 'flex-start', textAlign: 'left', borderRadius: 2, p: 1.5,
                            textTransform: 'none', borderStyle: isSelected ? 'solid' : 'dashed',
                            boxShadow: isSelected ? 2 : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Box sx={{ width: '100%', overflow: 'hidden' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 900, display: 'block', opacity: 0.8, mb: 0.4 }}>AI 추천 메뉴</Typography>
                            <Typography sx={{ fontWeight: 900, fontSize: '0.85rem', lineHeight: 1.3, wordBreak: 'keep-all' }}>{recommended.menu}</Typography>
                          </Box>
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Paper sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fff7ed', border: '1px solid #ffedd5', mt: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 0.8, color: '#ea580c', fontSize: '0.75rem' }}>
              <ShoppingCart size={14} /> 필요 재료 (장보기 리스트)
            </Typography>
            <Button size="small" variant="contained" color="warning" onClick={handleAddShoppingItems} sx={{ borderRadius: 10, fontSize: '0.6rem', py: 0.4, px: 1.5, fontWeight: 800 }}>전체 추가</Button>
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
            {mealPlan.requiredIngredients.map((ing, i) => <Chip key={i} label={ing} size="small" sx={{ bgcolor: 'white', height: 22, fontSize: '0.65rem', fontWeight: 800, border: '1px solid #fed7aa' }} />)}
          </Box>
        </Paper>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 1, pb: 3, zIndex: 10 }}>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<Save size={20} />}
            onClick={handleSaveToWeekly}
            sx={{ borderRadius: 3, fontWeight: 900, py: 1.2, fontSize: '0.9rem', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}
          >
            선택한 {selectedMenus.length}개 식단 저장
          </Button>
          <Button variant="outlined" onClick={() => setMealPlan(null)} sx={{ borderRadius: 3, minWidth: 90, fontWeight: 800 }}>취소</Button>
        </Box>

        <Dialog 
          open={Boolean(conflictData)} 
          onClose={() => setConflictData(null)} 
          slotProps={{ paper: { sx: { borderRadius: 4 } } }}
        >
          <DialogTitle sx={{ fontWeight: 900, fontSize: '1rem', pb: 1 }}>이미 식단이 있습니다</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontWeight: 700 }}>
              {conflictData?.day} {conflictData?.type === 'breakfast' ? '아침' : conflictData?.type === 'lunch' ? '점심' : conflictData?.type === 'dinner' ? '저녁' : ''} 식단을 변경하시겠습니까?
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', bgcolor: '#f8fafc', p: 2, borderRadius: 3 }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, display: 'block', mb: 0.5 }}>현재</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{conflictData?.currentMenu}</Typography>
              </Box>
              <ArrowRight size={20} color="#94a3b8" />
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block', mb: 0.5 }}>변경 후</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: '0.85rem', color: 'primary.main' }}>{conflictData?.newMenu}</Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setConflictData(null)} sx={{ fontWeight: 800 }}>유지하기</Button>
            <Button variant="contained" onClick={handleResolveConflict} sx={{ fontWeight: 900, borderRadius: 2 }}>교체하기</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Paper sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fdfcfe', border: '1px solid #ede9fe' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 0.5 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Calendar size={16} color="#7c3aed" />
            <Typography variant="body2" sx={{ fontWeight: 900, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>식단 도우미</Typography>
          </Stack>
          <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
            <FormControlLabel
              control={<Checkbox checked={schoolMealMode} onChange={(e) => {
                setSchoolMealMode(e.target.checked);
                if (e.target.checked) setHasChild(true);
              }} color="success" size="small" />}
              label={<Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>급식</Typography>}
              sx={{ mr: -0.5, '& .MuiFormControlLabel-label': { ml: -0.5 } }}
            />
            <FormControlLabel
              control={<Checkbox checked={useFridge} onChange={(e) => setUseFridge(e.target.checked)} color="primary" size="small" />}
              label={<Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>냉장고</Typography>}
              sx={{ mr: -0.5, '& .MuiFormControlLabel-label': { ml: -0.5 } }}
            />
            <FormControlLabel
              control={<Checkbox checked={hasChild} onChange={(e) => setHasChild(e.target.checked)} color="secondary" size="small" />}
              label={<Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>유아</Typography>}
              sx={{ mr: 0, '& .MuiFormControlLabel-label': { ml: -0.5 } }}
            />
          </Stack>
        </Stack>

        <TextField
          fullWidth
          multiline
          rows={1}
          placeholder="요청사항 (예: 고기 위주)"
          value={customRequest}
          onChange={(e) => setCustomRequest(e.target.value)}
          sx={{ mb: 1.5, '& .MuiInputBase-root': { borderRadius: 1.5, bgcolor: 'white', fontSize: '0.75rem' } }}
        />

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CircularProgress color="secondary" size={24} sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
              식단 구성 중...
            </Typography>
            <Button size="small" variant="outlined" color="error" onClick={handleCancel} sx={{ borderRadius: 1.5, fontSize: '0.65rem', py: 0.2 }}>
              중단하기
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Button 
              variant="contained" 
              fullWidth
              startIcon={<Sparkles size={16} />}
              onClick={handleGenerate}
              sx={{ 
                borderRadius: 2, 
                py: 0.8,
                fontWeight: 900,
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                boxShadow: '0 4px 12px rgba(124, 58, 23, 0.2)'
              }}
            >
              식단 짜기 시작
            </Button>
          </Box>
        )}
      </Paper>

      {mealPlanHistory.length > 0 && !loading && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, mb: 1, px: 0.5 }}>
            <HistoryIcon size={14} color="#64748b" />
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>최근 식단 내역</Typography>
          </Stack>
          <Stack spacing={0.8}>
            {mealPlanHistory.map((item) => (
              <Button 
                key={item.id}
                variant="outlined"
                fullWidth
                onClick={() => setMealPlan(item.plan)}
                sx={{ 
                  justifyContent: 'flex-start', 
                  borderRadius: 2.5, 
                  py: 1, 
                  px: 1.5,
                  border: '1px solid #e2e8f0',
                  bgcolor: 'white',
                  color: 'text.primary',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
                }}
              >
                <Stack direction="row" sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
                    {new Date(item.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.65rem' }}>다시보기</Typography>
                </Stack>
              </Button>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default MealPlanner;
