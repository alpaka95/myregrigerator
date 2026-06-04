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
  Alert,
  TextField,
  Tooltip
} from '@mui/material';
import { 
  Sparkles, 
  ShoppingCart, 
  Calendar,
  AlertCircle,
  Save,
  Archive,
  ArrowRight,
  Info
} from 'lucide-react';
import { aiService } from '../utils/aiService';
import { useFridgeStore } from '../store/useFridgeStore';

interface MealPlanResponse {
  plan: {
    day: string;
    breakfast: { menu: string; recipeLink: string; reason?: string };
    lunch: { menu: string; recipeLink: string; reason?: string };
    dinner: { menu: string; recipeLink: string; reason?: string };
  }[];
  requiredIngredients: string[];
}

const MealPlanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [hasChild, setHasChild] = useState(false);
  const [customRequest, setCustomRequest] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<{ day: string, type: 'breakfast' | 'lunch' | 'dinner', menu: string, recipeLink: string }[]>([]);
  
  const { items, addShoppingItem, updateWeeklyMenu, weeklyMenu } = useFridgeStore();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await aiService.getWeeklyMealPlan(items, hasChild, customRequest) as any;
      if (typeof response === 'object' && response.plan) {
        setMealPlan(response);
        setSelectedMenus([]); 
      } else {
        alert('식단을 짜는 데 실패했습니다. 다시 시도해 주세요.');
      }
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('503') || errorMsg.includes('high demand')) {
        alert('🤖 AI 서버가 현재 매우 바쁩니다(503 오류).\n\n구글 AI 서버에 사용자가 몰려 일시적으로 응답이 지연되고 있습니다. 1~2분 뒤에 다시 시도해 주시면 감사하겠습니다!');
      } else {
        alert(`에러: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuSelection = (day: string, type: 'breakfast' | 'lunch' | 'dinner', menu: string, recipeLink: string) => {
    setSelectedMenus(prev => {
      const exists = prev.find(m => m.day === day && m.type === type);
      if (exists) {
        return prev.filter(m => !(m.day === day && m.type === type));
      } else {
        return [...prev, { day, type, menu, recipeLink }];
      }
    });
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
    } catch (err) {
      alert('저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToArchive = async (menu: string, link: string) => {
    try {
      const holdingId = `holding_${Math.random().toString(36).substring(2, 9)}`;
      await updateWeeklyMenu(holdingId, menu, link);
      alert('📦 보관함에 저장되었습니다!');
    } catch (err) {
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
        <Alert 
          icon={<AlertCircle size={14} />} 
          severity="info" 
          sx={{ 
            borderRadius: 2, 
            py: 0.5, 
            '& .MuiAlert-message': { fontSize: '0.7rem', fontWeight: 800 } 
          }}
        >
          메뉴를 눌러 선택하세요. ({selectedMenus.length}개 선택됨)
        </Alert>

        <Stack spacing={1}>
          {mealPlan.plan.map((day, idx) => (
            <Card key={idx} variant="outlined" sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ bgcolor: '#f8fafc', py: 0.5, px: 1.5, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.7rem' }}>{day.day}</Typography>
              </Box>
              <CardContent sx={{ p: 1.5 }}>
                <Stack spacing={1.5}>
                  {(['breakfast', 'lunch', 'dinner'] as const).map(type => {
                    const id = `${day.day}_${type}`;
                    const currentMeal = weeklyMenu.find(m => m.id === id);
                    const recommended = day[type];
                    const isSelected = selectedMenus.find(m => m.day === day.day && m.type === type);
                    
                    return (
                      <Box key={type}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: type === 'breakfast' ? 'success.main' : type === 'lunch' ? 'primary.main' : 'error.main', fontSize: '0.65rem' }}>
                              {type === 'breakfast' ? '아침' : type === 'lunch' ? '점심' : '저녁'}
                            </Typography>
                            {recommended.reason && (
                              <Tooltip title={recommended.reason} arrow>
                                <Info size={12} color="#94a3b8" style={{ cursor: 'help' }} />
                              </Tooltip>
                            )}
                          </Stack>
                          <Button 
                            size="small" 
                            startIcon={<Archive size={10} />} 
                            onClick={() => handleSaveToArchive(recommended.menu, recommended.recipeLink)}
                            sx={{ fontSize: '0.6rem', py: 0, height: 18, minWidth: 0, opacity: 0.7 }}
                          >
                            보관함에 킵
                          </Button>
                        </Stack>
                        
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch' }}>
                          {currentMeal?.menu && (
                            <Paper variant="outlined" sx={{ flex: 1, p: 1, bgcolor: '#f1f5f9', borderStyle: 'dashed', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 800, color: 'text.disabled', mb: 0.2 }}>현재</Typography>
                              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', lineClamp: 1, overflow: 'hidden' }}>{currentMeal.menu}</Typography>
                            </Paper>
                          )}
                          
                          {currentMeal?.menu && <Box sx={{ display: 'flex', alignItems: 'center' }}><ArrowRight size={14} color="#cbd5e1" /></Box>}

                          <Button 
                            fullWidth 
                            variant={isSelected ? "contained" : "outlined"}
                            onClick={() => toggleMenuSelection(day.day, type, recommended.menu, recommended.recipeLink)}
                            color={type === 'breakfast' ? 'success' : type === 'lunch' ? 'primary' : 'error'}
                            sx={{ 
                              flex: 2, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 1.5, p: 1,
                              textTransform: 'none'
                            }}
                          >
                            <Box sx={{ width: '100%' }}>
                              <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 800, display: 'block', opacity: 0.8, mb: 0.2 }}>AI 추천</Typography>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', lineHeight: 1.2 }}>{recommended.menu}</Typography>
                              {recommended.reason && (
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.3, opacity: 0.9, fontStyle: 'italic', fontWeight: 600 }}>
                                  ✨ {recommended.reason}
                                </Typography>
                              )}
                            </Box>
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Paper sx={{ p: 1, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #ffedd5' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 0.5, color: '#ea580c', fontSize: '0.65rem' }}>
              <ShoppingCart size={12} /> 필요 재료
            </Typography>
            <Button size="small" variant="outlined" color="warning" onClick={handleAddShoppingItems} sx={{ borderRadius: 10, fontSize: '0.55rem', py: 0.2, px: 1, minHeight: 0 }}>장보기에 추가</Button>
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
            {mealPlan.requiredIngredients.map((ing, i) => <Chip key={i} label={ing} size="small" sx={{ bgcolor: 'white', height: 18, fontSize: '0.6rem', fontWeight: 800 }} />)}
          </Box>
        </Paper>

        <Box sx={{ mt: 1, display: 'flex', gap: 1, position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 1, pb: 2, zIndex: 5 }}>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<Save size={18} />}
            onClick={handleSaveToWeekly}
            sx={{ borderRadius: 2, fontWeight: 900, py: 1 }}
          >
            선택한 식단으로 교체하기
          </Button>
          <Button variant="outlined" onClick={() => setMealPlan(null)} sx={{ borderRadius: 2, minWidth: 80 }}>취소</Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Paper sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fdfcfe', border: '1px solid #ede9fe' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
            <Calendar size={18} color="#7c3aed" />
            <Typography variant="body2" sx={{ fontWeight: 900 }}>AI 식단 도우미</Typography>
          </Stack>
          <FormControlLabel
            control={<Checkbox checked={hasChild} onChange={(e) => setHasChild(e.target.checked)} color="secondary" size="small" />}
            label={<Typography variant="caption" sx={{ fontWeight: 700 }}>유아 동반</Typography>}
          />
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
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
              식단 구성 중...
            </Typography>
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
    </Box>
  );
};

export default MealPlanner;
