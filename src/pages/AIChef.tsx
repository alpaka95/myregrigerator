
import React, { useState } from 'react';
import { Button, Card, CardContent, CircularProgress, Container, Typography, Box, Paper, Grid, Chip, ToggleButton, ToggleButtonGroup, Stack, Divider } from '@mui/material';
import { Sparkles, BrainCircuit, ChefHat, Calendar, Flame, PiggyBank, Award, CheckCircle2, Trash2 } from 'lucide-react';
import { useFridgeStore } from '../store/useFridgeStore';
import { useAIStore } from '../store/useAIStore';
import { aiService } from '../utils/aiService';
import ReactMarkdown from 'react-markdown';
import MealPlanner from '../components/MealPlanner';

const FridgeChallenge: React.FC = () => {
  const items = useFridgeStore(state => state.items);
  const { activeChallenge, startChallenge, toggleChallengeStep, cancelChallenge } = useAIStore();
  const [generating, setGenerating] = useState(false);

  const handleStartChallenge = async () => {
    setGenerating(true);
    try {
      const challengeData = await aiService.getEmptyingChallenge(items);
      if (challengeData && challengeData.steps) {
        startChallenge({
          id: `challenge_${Date.now()}`,
          startDate: Date.now(),
          targetItems: challengeData.targetItems || [],
          steps: challengeData.steps.map((step: any) => ({ ...step, completed: false })),
          estimatedSavings: challengeData.estimatedSavings || 30000,
          completed: false
        });
      } else {
        alert('챌린지를 생성하는 데 실패했습니다. 다시 시도해 주세요.');
      }
    } catch (error) {
      console.error(error);
      alert('에러가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
        <Typography variant="h6" sx={{ mt: 3, fontWeight: 'bold' }}>🔥 AI 셰프가 냉장고를 파헤치는 중...</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          유통기한 임박 식재료를 사용한 가장 맛있는 3일 레시피를 계산하고 있습니다.
        </Typography>
      </Box>
    );
  }

  const expiringSoon = items
    .filter(i => i.expiryDate)
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
    .slice(0, 3);

  if (!activeChallenge) {
    return (
      <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', p: 3, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
        <Flame size={54} color="#f97316" style={{ margin: '0 auto 16px auto', filter: 'drop-shadow(0 4px 6px rgba(249, 115, 22, 0.2))' }} />
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.5 }}>AI 냉장고 파먹기 챌린지 🌳</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2, lineHeight: 1.6 }}>
          냉장고 속 방치된 재료나 유통기한이 임박한 식재료들을 활용하여 장보기 비용을 절약하고, 환경을 보호하는 3일간의 절약 요리 챌린지입니다!
        </Typography>

        {expiringSoon.length > 0 && (
          <Box sx={{ bgcolor: 'rgba(249, 115, 22, 0.05)', p: 2, borderRadius: '12px', mb: 4, textAlign: 'left' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#c2410c', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              🎯 이번 챌린지 추천 타겟 재료
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {expiringSoon.map(item => (
                <Chip 
                  key={item.id} 
                  label={`${item.name} (${item.expiryDate ? Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0}일 남음)`} 
                  color="warning" 
                  variant="outlined" 
                  sx={{ fontWeight: 'bold' }} 
                />
              ))}
            </Box>
          </Box>
        )}

        <Button 
          variant="contained" 
          size="large" 
          onClick={handleStartChallenge}
          disabled={items.length === 0}
          sx={{ 
            borderRadius: '12px', 
            py: 1.5, 
            px: 4,
            fontWeight: 'bold', 
            background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
            boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ea580c 0%, #db2777 100%)',
            }
          }}
        >
          파먹기 챌린지 생성하기 🚀
        </Button>
        {items.length === 0 && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            챌린지를 생성하려면 냉장고에 식재료를 먼저 추가해 주세요.
          </Typography>
        )}
      </Card>
    );
  }

  const completedCount = activeChallenge.steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / activeChallenge.steps.length) * 100);

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      {activeChallenge.completed && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: '16px', 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: 'white',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
          }}
        >
          <Award size={48} style={{ marginBottom: 12 }} />
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>🎉 챌린지 대성공! 🎉</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 700, mb: 2 }}>
            남은 식재료를 맛있게 소비하여 환경도 지키고 식비도 절약했습니다!
          </Typography>
          <Chip 
            label={`누적 절약 금액: ${activeChallenge.estimatedSavings.toLocaleString()}원`} 
            sx={{ bgcolor: 'white', color: '#047857', fontWeight: 900, py: 2, px: 1, fontSize: '0.95rem' }} 
          />
        </Paper>
      )}

      <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
              🔥 냉장고 털기 진행 중
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              시작일: {new Date(activeChallenge.startDate).toLocaleDateString()}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip 
              icon={<PiggyBank size={14} color="#059669" />} 
              label={`절약 예상: ${activeChallenge.estimatedSavings.toLocaleString()}원`} 
              sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 800 }} 
            />
            <Button 
              variant="outlined" 
              color="error" 
              size="small" 
              startIcon={<Trash2 size={14} />} 
              onClick={() => {
                if (confirm("챌린지를 취소하고 초기화하시겠습니까? 완료한 기록이 사라집니다.")) {
                  cancelChallenge();
                }
              }}
              sx={{ borderRadius: '8px', fontWeight: 'bold' }}
            >
              종료
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>진행률</Typography>
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main' }}>{completedCount} / 3일 완료 ({progressPercent}%)</Typography>
          </Box>
          <Box sx={{ height: 10, width: '100%', bgcolor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${progressPercent}%`, bgcolor: '#f97316', transition: 'width 0.3s ease', borderRadius: '5px' }} />
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.secondary', mb: 1 }}>🎯 타겟 식재료:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {activeChallenge.targetItems.map((item, idx) => (
              <Chip key={idx} label={item} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={2.5}>
          {activeChallenge.steps.map((step) => {
            const isCompleted = step.completed;
            return (
              <Paper 
                key={step.day} 
                variant="outlined" 
                sx={{ 
                  p: 2.5, 
                  borderRadius: '12px', 
                  borderColor: isCompleted ? '#10b981' : '#e2e8f0',
                  bgcolor: isCompleted ? 'rgba(16, 185, 129, 0.02)' : 'white',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: isCompleted ? '#10b981' : 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {isCompleted ? <CheckCircle2 size={18} color="#10b981" /> : <Flame size={18} color="#f97316" />}
                    Day {step.day}: {step.recipeName}
                  </Typography>
                  <Button
                    size="small"
                    variant={isCompleted ? "contained" : "outlined"}
                    color={isCompleted ? "success" : "primary"}
                    onClick={() => toggleChallengeStep(step.day)}
                    sx={{ borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', px: 2 }}
                  >
                    {isCompleted ? "완료됨" : "먹기 완료"}
                  </Button>
                </Stack>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>사용된 타겟 재료:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {step.ingredientsUsed.map((ing, i) => (
                      <Chip key={i} label={ing} size="small" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }} />
                    ))}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {step.instructions}
                </Typography>
              </Paper>
            );
          })}
        </Stack>
      </Card>
    </Box>
  );
};

const AIChefPage: React.FC = () => {
  const items = useFridgeStore(state => state.items);
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState('');
  const [activeTab, setActiveTab] = useState<'recipe' | 'mealPlan' | 'challenge'>('recipe');

  const handleGenerateRecipe = async () => {
    setLoading(true);
    setRecipe('');
    try {
      const availableItems = items.filter(item => {
        if (!item.expiryDate) return true;
        const today = new Date();
        const expiry = new Date(item.expiryDate);
        return expiry >= today;
      });

      const result = await aiService.getRecipeChef(availableItems);
      setRecipe(result);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "레시피를 생성하는 동안 오류가 발생했습니다.";
      setRecipe(`> 😥 **오류가 발생했습니다**

${errorMessage}

잠시 후 다시 시도해주세요.`);
    } finally {
      setLoading(false);
    }
  };

  const freshItems = items.filter(i => {
    if (!i.expiryDate) return true;
    const diff = new Date(i.expiryDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 3;
  });

  const expiringSoonItems = items.filter(i => {
    if (!i.expiryDate) return false;
    const diff = new Date(i.expiryDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 3;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ 
        p: {xs: 2, md: 4}, 
        mb: 3, 
        borderRadius: '20px', 
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          {activeTab === 'recipe' ? (
            <ChefHat size={48} color="rgba(99, 102, 241, 1)" style={{ marginBottom: '16px' }}/>
          ) : activeTab === 'mealPlan' ? (
            <Calendar size={48} color="rgba(168, 85, 247, 1)" style={{ marginBottom: '16px' }}/>
          ) : (
            <Flame size={48} color="#f97316" style={{ marginBottom: '16px' }}/>
          )}
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            AI 셰프
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', margin: 'auto' }}>
            {activeTab === 'recipe' 
              ? '냉장고 속 재료를 기반으로 똑똑한 AI가 추천해주는 맛있는 레시피로 완벽한 한 끼를 준비해보세요.'
              : activeTab === 'mealPlan'
              ? '냉장고 속 재료와 요청사항을 바탕으로 AI가 영양 가득한 일주일 식단을 추천해 드립니다.'
              : '냉장고 속 임박 식재료를 구출하고 추가 장보기 지출을 아끼는 3일 파먹기 챌린지를 즐겨보세요!'}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Paper elevation={0} sx={{ p: 0.5, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: '14px', display: 'inline-flex' }}>
          <ToggleButtonGroup
            value={activeTab}
            exclusive
            onChange={(_, val) => val && setActiveTab(val)}
            sx={{
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '10px',
                px: 3,
                py: 1,
                fontWeight: 'bold',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'white',
                  color: 'primary.main',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                  '&:hover': { bgcolor: 'white' }
                }
              }
            }}
          >
            <ToggleButton value="recipe">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ChefHat size={18} />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>AI 레시피 추천</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="mealPlan">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Calendar size={18} />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>AI 일주일 식단</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="challenge">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Flame size={18} />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>냉장고 파먹기</Typography>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Box>

      {activeTab === 'recipe' ? (
        <Grid container spacing={4} component="div">
          <Grid size={{ xs: 12, md: 4 }} component="div">
              <Card sx={{ borderRadius: '16px', height: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
                  <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BrainCircuit size={20} /> 현재 냉장고 재료
                      </Typography>
                      <Box sx={{ maxHeight: '300px', overflowY: 'auto', p: 1 }}>
                          <Typography variant="subtitle2" color="success.main" sx={{mb: 1}}>신선한 재료</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              {freshItems.length > 0 ? freshItems.map(item => (
                                  <Chip key={item.id} label={item.name} color="success" variant="outlined" />
                              )) : <Typography variant="body2" color="text.secondary">신선한 재료가 없습니다.</Typography>}
                          </Box>

                          <Typography variant="subtitle2" color="warning.main" sx={{mb: 1}}>마감 임박 재료</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {expiringSoonItems.length > 0 ? expiringSoonItems.map(item => (
                                  <Chip key={item.id} label={item.name} color="warning" variant="outlined" />
                              )) : <Typography variant="body2" color="text.secondary">마감 임박 재료가 없습니다.</Typography>}
                          </Box>
                      </Box>
                      <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          onClick={handleGenerateRecipe}
                          disabled={loading || items.length === 0}
                          startIcon={!loading && <Sparkles size={18} />}
                          sx={{ 
                            mt: 3,
                            borderRadius: '12px',
                            py: 1.5,
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'scale(1.02)'
                            }
                          }}
                      >
                          {loading ? <CircularProgress size={24} color="inherit" /> : 'AI 레시피 생성하기'}
                      </Button>
                       {items.length === 0 && <Typography variant="caption" component="span" sx={{ display: 'block', color: 'text.secondary', textAlign: 'center', mt: 1 }}>레시피를 생성하려면 냉장고에 재료를 추가해주세요.</Typography>}
                  </CardContent>
              </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }} component="div">
            <Card sx={{ borderRadius: '16px', height: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  추천 레시피
                </Typography>
                <Box sx={{ minHeight: '300px', p: 2, border: '1px dashed #e0e0e0', borderRadius: '12px', background: '#f9fafb' }}>
                  {loading && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
                          <CircularProgress />
                          <Typography sx={{ mt: 2 }}>AI 셰프가 맛있는 레시피를 구상 중입니다...</Typography>
                      </Box>
                  )}
                  {recipe ? (
                    <ReactMarkdown
                      components={{
                        h1: ({...props}) => <Typography variant="h4" gutterBottom component="h1" {...props} />,
                        h2: ({...props}) => <Typography variant="h5" gutterBottom component="h2" {...props} />,
                        h3: ({...props}) => <Typography variant="h6" gutterBottom component="h3" {...props} />,
                        p: ({...props}) => <Typography variant="body1" component="p" sx={{ mb: 2 }} {...props} />,
                        li: ({...props}) => <li style={{ marginBottom: '8px' }}><Typography variant="body1" component="span" {...props} /></li>,
                      }}
                    >
                      {recipe}
                    </ReactMarkdown>
                  ) : !loading && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', textAlign: 'center' }}>
                          <ChefHat size={40} color="grey" />
                          <Typography sx={{ mt: 2, color: 'text.secondary' }}>버튼을 눌러 추천 레시피를 받아보세요!</Typography>
                      </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : activeTab === 'mealPlan' ? (
        <Box sx={{ maxWidth: 'md', mx: 'auto' }}>
          <MealPlanner />
        </Box>
      ) : (
        <FridgeChallenge />
      )}
    </Container>
  );
};

export default AIChefPage;
