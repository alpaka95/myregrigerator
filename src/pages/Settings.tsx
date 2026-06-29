import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Stack, 
  FormControl, 
  RadioGroup, 
  FormControlLabel, 
  Radio,
  IconButton,
  Alert,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Select,
  MenuItem,
  Divider,
  Chip
} from '@mui/material';
import { ChevronLeft, Save, RefreshCw, Activity, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIStore } from '../store/useAIStore';
import { aiService } from '../utils/aiService';
import InstallPWA from '../components/InstallPWA';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { config, updateConfig } = useAIStore();
  const [geminiKey, setGeminiKey] = React.useState(config.geminiApiKey || '');
  const [openaiKey, setOpenaiKey] = React.useState(config.openaiApiKey || '');
  const [provider, setProvider] = React.useState(config.preferredProvider);
  const [geminiModel, setGeminiModel] = React.useState(config.geminiModel || 'gemini-1.5-flash');
  const [dietPrefs, setDietPrefs] = React.useState<string[]>(config.dietPreferences || []);
  
  const [diagnosing, setDiagnosing] = React.useState(false);
  const [diagResult, setDiagnoseResult] = React.useState<string[] | null>(null);

  const handleSave = () => {
    updateConfig({
      geminiApiKey: geminiKey.trim(),
      openaiApiKey: openaiKey.trim(),
      preferredProvider: provider,
      geminiModel: geminiModel,
      dietPreferences: dietPrefs
    });
    alert('✅ 설정이 저장되었습니다!');
  };

  const handleDiagnose = async () => {
    if (!geminiKey.trim()) return alert('Gemini 키를 먼저 입력해주세요.');
    setDiagnosing(true);
    setDiagnoseResult(null);
    try {
      const models = await aiService.listAvailableModels();
      const names = models.map((m: any) => m.name.replace('models/', ''));
      setDiagnoseResult(names);
    } catch (err: any) {
      alert(`진단 실패: ${err.message}`);
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 8 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}><ChevronLeft /></IconButton>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>설정</Typography>
      </Stack>

      <Stack spacing={3}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800 }}>0. 앱 설치</Typography>
        <Paper sx={{ p: 1, borderRadius: 4, bgcolor: 'primary.50' }}>
          <InstallPWA />
        </Paper>

        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800 }}>1. API 키 발급 (무료)</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, bgcolor: 'primary.50' }}>
            <CardActionArea component="a" href="https://aistudio.google.com/app/apikey" target="_blank">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.dark' }}>Google Gemini</Typography>
                <Typography variant="caption" color="text.secondary">무료/무제한 가깝게 사용</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
          <Card variant="outlined" sx={{ flex: 1, borderRadius: 3 }}>
            <CardActionArea component="a" href="https://platform.openai.com/api-keys" target="_blank">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>ChatGPT (OpenAI)</Typography>
                <Typography variant="caption" color="text.secondary">유료 선불 크레딧 방식</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Stack>

        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800 }}>2. 서비스 설정</Typography>
        <Paper sx={{ p: 3, borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
          <Stack spacing={3}>
            <FormControl>
              <RadioGroup row value={provider} onChange={(e) => setProvider(e.target.value as 'gemini' | 'openai')}>
                <FormControlLabel value="gemini" control={<Radio />} label={<Typography sx={{ fontWeight: 700 }}>Gemini</Typography>} />
                <FormControlLabel value="openai" control={<Radio />} label={<Typography sx={{ fontWeight: 700 }}>ChatGPT</Typography>} />
              </RadioGroup>
            </FormControl>

            {provider === 'gemini' ? (
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>Gemini API 키</Typography>
                  <TextField fullWidth type="password" placeholder="AIza로 시작하는 키" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>모델 선택</Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={geminiModel}
                      onChange={(e: any) => setGeminiModel(e.target.value)}
                      sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                      <MenuItem value="gemini-1.5-flash">
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Zap size={14} color="#f59e0b" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>Gemini 1.5 Flash</Typography>
                            <Typography variant="caption" color="text.secondary">매우 빠른 응답, 일상적인 용도</Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="gemini-1.5-pro">
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Sparkles size={14} color="#8b5cf6" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>Gemini 1.5 Pro</Typography>
                            <Typography variant="caption" color="text.secondary">복잡한 추론, 정교한 레시피 추천</Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={diagnosing ? <CircularProgress size={16} /> : <Activity size={16} />}
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  sx={{ borderRadius: 2 }}
                >
                  연결 상태 진단하기
                </Button>
                {diagResult && (
                  <Alert severity="success" sx={{ fontSize: '0.75rem', borderRadius: 2 }}>
                    사용 가능한 모델: {diagResult.slice(0, 3).join(', ')} 등 {diagResult.length}개 발견!
                  </Alert>
                )}
              </Stack>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>OpenAI API 키</Typography>
                <TextField fullWidth type="password" placeholder="sk-로 시작하는 키" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
              </Box>
            )}

            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, mb: 1.5 }}>🥗 식습관 취향 필터 (AI 레시피 및 식단용)</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['비건(채식)', '저염식', '다이어트/고단백', '키토/저탄고지', '맵지 않게', '유아/어린이 맞춤'].map(pref => {
                  const isChecked = dietPrefs.includes(pref);
                  return (
                    <Chip
                      key={pref}
                      label={pref}
                      clickable
                      color={isChecked ? "primary" : "default"}
                      variant={isChecked ? "filled" : "outlined"}
                      onClick={() => {
                        setDietPrefs(prev => 
                          isChecked ? prev.filter(p => p !== pref) : [...prev, pref]
                        );
                      }}
                      sx={{ 
                        fontWeight: 800, 
                        borderRadius: '8px',
                        '&.MuiChip-colorPrimary': {
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          border: 'none'
                        }
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            <Divider />

            <Stack direction="row" spacing={2}>
              <Button fullWidth variant="contained" size="large" startIcon={<Save />} onClick={handleSave} sx={{ borderRadius: 3, py: 1.5, fontWeight: 900 }}>설정 저장</Button>
              <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: '#f1f5f9', borderRadius: 3, width: 56 }}><RefreshCw size={24} /></IconButton>
            </Stack>
          </Stack>
        </Paper>

        <Alert severity="info" sx={{ borderRadius: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>💡 팁: 어떤 모델을 쓸까요?</Typography>
          <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
            - <b>Flash:</b> 장보기 목록 분석, 간단한 질문 등 빠른 답변이 필요할 때 좋습니다.<br/>
            - <b>Pro:</b> 정교한 일주일 식단 짜기, 어려운 재료 조합의 레시피를 원할 때 추천합니다.
          </Typography>
        </Alert>

        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>계속 실패하시나요?</Typography>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.8rem' }}>
            <li>키를 발급받자마자 쓰면 약 1~5분 정도 등록 시간이 걸릴 수 있습니다.</li>
            <li>브라우저 <b>시크릿 모드</b>에서 테스트해 보세요. (광고 차단 확장 프로그램 간섭 방지)</li>
          </ul>
        </Alert>
      </Stack>
    </Box>
  );
};

export default Settings;
