import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  IconButton, 
  TextField, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip
} from '@mui/material';
import { 
  ChevronLeft, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Save,
  GripHorizontal,
  LogOut,
  Archive,
  LayoutGrid,
  History,
  Columns,
  CheckCircle2
} from 'lucide-react';
import { useFridgeStore } from '../store/useFridgeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

const MealPlan: React.FC = () => {
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    if (viewMode === 'daily') {
      const today = new Date().getDay();
      const index = today === 0 ? 6 : today - 1;
      if (dayRefs.current[index]) {
        setTimeout(() => {
          dayRefs.current[index]?.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest"
          });
        }, 300);
      }
    }
  }, [viewMode]);

  const navigate = useNavigate();
  const { weeklyMenu, updateWeeklyMenu, swapWeeklyMenu, markWeeklyMenuAsRead, clearWeeklySlots, clearArchive } = useFridgeStore();
  const { user, signOut } = useAuthStore();
  
  const [editingMeal, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ menu: '', link: '' });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } })
  );

  const handleEditClick = (id: string, currentMenu?: string, currentLink?: string) => {
    setEditingId(id);
    setEditValue({ menu: currentMenu || '', link: currentLink || '' });
  };

  const handleSaveEdit = async () => {
    if (editingMeal) {
      await updateWeeklyMenu(editingMeal, editValue.menu, editValue.link);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 식단을 삭제할까요?')) {
      await updateWeeklyMenu(id, '', ''); 
    }
  };

  const handleSlotClick = async (id: string) => {
    if (selectedArchiveId) {
      const sourceId = selectedArchiveId;
      setSelectedArchiveId(null);
      await swapWeeklyMenu(sourceId, id);
    } else {
      markWeeklyMenuAsRead(id);
    }
  };

  const handleArchiveDoubleClick = (id: string) => {
    setSelectedArchiveId(prev => prev === id ? null : id);
  };

  const handleDoubleClick = async (id: string) => {
    if (id.startsWith('holding_')) return;
    const meal = weeklyMenu.find(m => m.id === id);
    if (!meal || !meal.menu) return;
    
    await swapWeeklyMenu(id, 'holding_area_dropzone');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      await swapWeeklyMenu(active.id as string, over.id as string);
    }
  };

  const activeMeal = useMemo(() => (weeklyMenu || []).find(m => m.id === activeId), [activeId, weeklyMenu]);
  const archivedMeals = useMemo(() => (weeklyMenu || []).filter(m => m.id.startsWith('holding_')), [weeklyMenu]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: '#f8fafc',
        overflow: 'hidden'
      }}>
        {/* Header - Fixed */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'white', borderBottom: '1px solid #e2e8f0', zIndex: 10 }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.dark', letterSpacing: -0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>🗓️ 식단표</Typography>
                <Chip 
                  label={useAuthStore.getState().profile?.householdId ? "클라우드" : "연결중..."} 
                  size="small" 
                  color={useAuthStore.getState().profile?.householdId ? "success" : "warning"} 
                  variant="outlined"
                  sx={{ height: 16, fontSize: '0.55rem', fontWeight: 900, display: { xs: 'none', sm: 'inline-flex' } }}
                />
              </Stack>
              
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={<Share2 size={14} />}
                  onClick={() => setIsShareOpen(true)}
                  sx={{ borderRadius: 2, fontSize: '0.7rem', fontWeight: 800, height: 32, px: 1.5, display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  공유
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="error" 
                  startIcon={<Trash2 size={14} />}
                  onClick={() => { if(confirm('식단표의 모든 항목을 비우시겠습니까?')) clearWeeklySlots(); }}
                  sx={{ borderRadius: 2, fontSize: '0.7rem', fontWeight: 800, height: 32, px: 1.5 }}
                >
                  비우기
                </Button>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, val) => val && setViewMode(val)}
                  size="small"
                  sx={{ bgcolor: '#f1f5f9', p: 0.3, borderRadius: 2 }}
                >
                  <ToggleButton value="daily" sx={{ px: 1, py: 0.5, borderRadius: '6px !important', border: 'none !important', '&.Mui-selected': { bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                    <Tooltip title="일별 보기"><Columns size={16} /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="weekly" sx={{ px: 1, py: 0.5, borderRadius: '6px !important', border: 'none !important', '&.Mui-selected': { bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                    <Tooltip title="주간 보기"><LayoutGrid size={16} /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
                <IconButton size="small" color="error" onClick={() => signOut()} sx={{ bgcolor: 'error.50' }}>
                  <LogOut size={16} />
                </IconButton>
              </Stack>
            </Box>

            {viewMode === 'daily' ? (
              <Box sx={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 1.5, 
                pb: 1,
                px: 0.5,
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 10 },
                scrollSnapType: 'x mandatory'
              }}>
                {DAYS.map((day, idx) => (
                  <Paper 
                    key={day} 
                    ref={el => { dayRefs.current[idx] = el; }}
                    sx={{ 
                      minWidth: { xs: '260px', sm: 280 }, 
                      p: 1.5, 
                      borderRadius: 3, 
                      scrollSnapAlign: 'center',
                      bgcolor: '#fff',
                      border: '1px solid rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, textAlign: 'center', color: 'text.secondary', mb: 0.5, fontSize: '0.75rem' }}>{day}</Typography>
                    
                    <Stack spacing={0.8}>
                      {MEAL_TYPES.map(type => {
                        const id = `${day}_${type}`;
                        const meal = (weeklyMenu || []).find(m => m.id === id);
                        return (
                          <MealSlot 
                            key={id}
                            id={id}
                            label={type === 'breakfast' ? '아침' : type === 'lunch' ? '점심' : '저녁'}
                            color={type === 'breakfast' ? '#f0fdf4' : type === 'lunch' ? '#f0f9ff' : '#fff7ed'}
                            labelColor={type === 'breakfast' ? '#16a34a' : type === 'lunch' ? '#0284c7' : '#ea580c'}
                            meal={meal}
                            userId={user?.uid}
                            onEdit={() => handleEditClick(id, meal?.menu, meal?.recipeLink)}
                            onDelete={() => handleDelete(id)}
                            onRead={() => handleSlotClick(id)}
                            onDoubleClick={() => handleDoubleClick(id)}
                            isTarget={!!selectedArchiveId}
                          />
                        );
                      })}
                    </Stack>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(8, 1fr)' }, gap: 1, pb: 1 }}>
                {DAYS.map((day) => (
                  <Paper key={day} sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled', display: 'block', textAlign: 'center', mb: 0.5, fontSize: '0.6rem' }}>{day.replace('요일', '')}</Typography>
                    <Stack spacing={0.5}>
                      {MEAL_TYPES.map(type => {
                        const id = `${day}_${type}`;
                        const meal = (weeklyMenu || []).find(m => m.id === id);
                        return (
                          <Box 
                            key={id} 
                            onClick={() => handleSlotClick(id)}
                            onDoubleClick={() => handleDoubleClick(id)}
                            sx={{ 
                              p: 0.5, 
                              borderRadius: 1, 
                              bgcolor: type === 'breakfast' ? '#f0fdf4' : type === 'lunch' ? '#f0f9ff' : '#fff7ed',
                              border: selectedArchiveId ? '1px dashed #7c3aed' : '1px solid rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6rem', color: meal?.menu ? 'text.primary' : 'text.disabled', lineClamp: 1, overflow: 'hidden' }}>
                              {meal?.menu || (type === 'breakfast' ? '아침' : type === 'lunch' ? '점심' : '저녁')}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Paper>
                ))}
                <Paper sx={{ p: 1, borderRadius: 2, border: '1px dashed rgba(124, 58, 237, 0.4)', bgcolor: 'rgba(124, 58, 237, 0.03)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#7c3aed', display: 'block', textAlign: 'center', mb: 0.5, fontSize: '0.6rem' }}>보관함</Typography>
                  <Box sx={{ flex: 1, overflowY: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', maxHeight: 130 }}>
                    <Stack spacing={0.5}>
                      {archivedMeals.length > 0 ? archivedMeals.map(meal => (
                        <Box 
                          key={meal.id} 
                          onClick={() => handleSlotClick(meal.id)}
                          onDoubleClick={() => handleArchiveDoubleClick(meal.id)}
                          sx={{ 
                            p: 0.5, 
                            borderRadius: 1, 
                            bgcolor: selectedArchiveId === meal.id ? 'secondary.50' : 'white',
                            border: selectedArchiveId === meal.id ? '1px solid #7c3aed' : '1px solid rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.6rem', color: selectedArchiveId === meal.id ? 'secondary.main' : 'text.primary', lineClamp: 1, overflow: 'hidden' }}>
                            {meal.menu}
                          </Typography>
                        </Box>
                      )) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center', display: 'block', mt: 1, fontSize: '0.6rem' }}>비어있음</Typography>
                      )}
                    </Stack>
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        </Box>

        {/* Scrollable Content (Holding Area) */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 2 }, pb: 10 }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History size={20} /> 보관함
                  <Chip label={archivedMeals.length} size="small" sx={{ fontWeight: 800, height: 20 }} />
                </Typography>
                <Button 
                  size="small" 
                  color="secondary" 
                  onClick={() => { if(confirm('보관함의 모든 항목을 비우시겠습니까?')) clearArchive(); }}
                  sx={{ fontSize: '0.65rem', fontWeight: 800, minWidth: 0, p: '2px 8px', bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}
                >
                  비우기
                </Button>
              </Stack>
              <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>
                두 번 탭하면 선택됩니다.
              </Typography>
            </Box>

            <DroppableArchive archivedMeals={archivedMeals} user={user} onEdit={handleEditClick} onDelete={handleDelete} onRead={markWeeklyMenuAsRead} onDoubleClick={handleArchiveDoubleClick} selectedId={selectedArchiveId} />
          </Box>
        </Box>

        <Dialog open={!!editingMeal} onClose={() => setEditingId(null)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 900 }}>메뉴 편집 🍳</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="메뉴 이름" fullWidth value={editValue.menu} onChange={(e) => setEditValue({ ...editValue, menu: e.target.value })} autoFocus />
              <TextField label="레시피 링크 (URL)" fullWidth value={editValue.link} onChange={(e) => setEditValue({ ...editValue, link: e.target.value })} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditingId(null)}>취소</Button>
            <Button variant="contained" startIcon={<Save />} onClick={handleSaveEdit}>저장</Button>
          </DialogActions>
        </Dialog>

        <ShareDialog open={isShareOpen} onClose={() => setIsShareOpen(false)} />

        <DragOverlay>
          {activeId && activeMeal ? (
            <Paper sx={{ 
              p: 1.5, 
              borderRadius: 3, 
              bgcolor: 'primary.main', 
              color: 'white', 
              opacity: 0.95, 
              boxShadow: '0 15px 30px rgba(0,0,0,0.25)', 
              minWidth: 200,
              cursor: 'grabbing'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{activeMeal.menu}</Typography>
            </Paper>
          ) : null}
        </DragOverlay>
      </Box>
    </DndContext>
  );
};

const DroppableArchive = ({ archivedMeals, user, onEdit, onDelete, onRead, onDoubleClick, selectedId }: any) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'holding_area_dropzone' });

  return (
    <Box 
      ref={setNodeRef}
      sx={{ 
        minHeight: 200, 
        p: 2, 
        borderRadius: 4, 
        bgcolor: isOver ? 'primary.50' : 'rgba(255,255,255,0.5)',
        border: `2px dashed ${isOver ? '#1976d2' : '#e2e8f0'}`,
        transition: 'all 0.3s ease',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
        gap: 1.5,
        alignContent: 'start'
      }}
    >
      {archivedMeals.length > 0 ? (
        archivedMeals.map((meal: any) => (
          <MealSlot 
            key={meal.id}
            id={meal.id}
            label="보관됨"
            color={selectedId === meal.id ? 'secondary.50' : "#ffffff"}
            labelColor="#64748b"
            meal={meal}
            userId={user?.uid}
            onEdit={() => onEdit(meal.id, meal.menu, meal.recipeLink)}
            onDelete={() => onDelete(meal.id)}
            onRead={() => onRead(meal.id)}
            onDoubleClick={() => onDoubleClick(meal.id)}
            isSelected={selectedId === meal.id}
          />
        ))
      ) : (
        <Box sx={{ gridColumn: '1 / -1', py: 6, textAlign: 'center', opacity: 0.5 }}>
          <Archive size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>보관된 식단이 없습니다.</Typography>
        </Box>
      )}
    </Box>
  );
};

const MealSlot = ({ id, label, color, labelColor, meal, userId, onEdit, onDelete, onRead, onDoubleClick, isTarget, isSelected }: any) => {
  const isUnread = meal && !meal.lastReadBy?.includes(userId || '');
  
  return (
    <DraggableSlot id={id} color={color} isUnread={isUnread} onRead={onRead} onDoubleClick={onDoubleClick} isSelected={isSelected} isTarget={isTarget}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
        <Typography variant="caption" sx={{ fontWeight: 900, color: labelColor, fontSize: '0.6rem' }}>{label}</Typography>
        <Stack direction="row" spacing={0.2}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }} sx={{ p: 0.1 }}><Edit3 size={10} /></IconButton>
          {meal && <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(); }} sx={{ p: 0.1 }}><Trash2 size={10} /></IconButton>}
        </Stack>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 22 }}>
        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', fontWeight: 800, lineClamp: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {meal?.menu || <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>비어있음</Typography>}
        </Typography>
        {meal?.recipeLink && (
          <IconButton size="small" component="a" href={meal.recipeLink} target="_blank" sx={{ p: 0, color: labelColor }}><ExternalLink size={12} /></IconButton>
        )}
      </Box>
    </DraggableSlot>
  );
};

const DraggableSlot = ({ id, children, color, isUnread, onRead, onDoubleClick, isSelected, isTarget }: any) => {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    transition: 'transform 500ms cubic-bezier(0.2, 0, 0, 1)'
  };

  return (
    <Box 
      ref={setDropRef}
      onClick={() => {
        onRead();
      }}
      onDoubleClick={(e) => { 
        e.stopPropagation(); 
        onDoubleClick?.(); 
      }}
      sx={{ 
        p: 0.8, 
        borderRadius: 2, 
        bgcolor: isOver ? 'primary.50' : color, 
        position: 'relative',
        border: isSelected ? '2px solid #7c3aed' : (isTarget ? '1px dashed #7c3aed' : (isUnread ? '1px solid #ef4444' : isOver ? '2px dashed #1976d2' : '1px solid rgba(0,0,0,0.05)')),
        transition: 'all 0.3s ease',
        boxShadow: isSelected ? '0 0 12px rgba(124, 58, 237, 0.2)' : (isUnread ? '0 0 8px rgba(239, 68, 68, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'),
        '&:hover': {
           boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
           borderColor: 'primary.light'
        },
        touchAction: 'auto',
        cursor: isTarget ? 'pointer' : 'default'
      }}
    >
      {isSelected && (
        <Box sx={{ position: 'absolute', top: -8, right: -8, zIndex: 5, bgcolor: 'white', borderRadius: '50%', display: 'flex', color: 'secondary.main' }}>
          <CheckCircle2 size={16} fill="currentColor" color="white" />
        </Box>
      )}
      <Box 
        ref={setDragRef} 
        style={style} 
        sx={{ 
          userSelect: 'none', 
          WebkitUserSelect: 'none',
          position: 'relative'
        }}
      >
        <Box 
          {...attributes} 
          {...listeners}
          sx={{ 
            position: 'absolute', 
            left: -8, 
            top: 0, 
            bottom: 0, 
            width: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab', 
            touchAction: 'none',
            zIndex: 2,
            opacity: isTarget ? 0 : 0.3,
            '&:active': { cursor: 'grabbing' }
          }}
        >
          <GripHorizontal size={14} />
        </Box>
        <Box sx={{ pl: 1.5 }}>
          {isUnread && <Box sx={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, bgcolor: '#ef4444', borderRadius: '50%' }} />}
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MealPlan;
