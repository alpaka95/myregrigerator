import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Typography, Box, IconButton, Button, 
  Paper, Stack, TextField, InputBase, Tooltip
} from '@mui/material';
import { 
  ArrowLeft, Plus, Minus, Calendar, Edit2, Check, X, Layout, Trash2
} from 'lucide-react';
import { 
  DndContext, useDroppable, DragOverlay,
  type DragEndEvent, type DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  closestCenter
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFridgeStore } from '../store/useFridgeStore';
import type { FoodItem } from '../types/index';
import AddItemDialog from '../components/AddItemDialog';

const SortableItemRow = ({ item, onUpdate, onRemove, onEdit }: { 
  item: FoodItem, 
  onUpdate: (id: string, updates: Partial<FoodItem>) => void,
  onRemove: (id: string) => void,
  onEdit: (item: FoodItem) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Paper 
        sx={{ 
          p: 1.5, 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderColor: 'primary.light' }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box 
            {...attributes} {...listeners}
            sx={{ 
              width: 32, height: 32, borderRadius: '8px', 
              bgcolor: 'rgba(0,0,0,0.03)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', 
              fontWeight: 800, color: 'text.secondary',
              cursor: 'grab', '&:active': { cursor: 'grabbing' },
              touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none'
            }}
          >
            {item.name[0]}
          </Box>
          <Box onClick={() => onEdit(item)} sx={{ cursor: 'pointer', flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              <Calendar size={10} />
              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{item.expiryDate || '미지정'}</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: '8px', p: 0.2 }}>
            <IconButton 
              size="small" 
              onClick={() => onUpdate(item.id, { quantity: Math.max(0, item.quantity - 1) })}
              sx={{ p: 0.5 }}
            >
              <Minus size={14} />
            </IconButton>
            <Typography sx={{ mx: 1, fontWeight: 800, minWidth: 20, textAlign: 'center', fontSize: '0.85rem' }}>
              {item.quantity}
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })}
              sx={{ p: 0.5 }}
            >
              <Plus size={14} />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, minWidth: 20 }}>{item.unit}</Typography>
          
          <IconButton size="small" onClick={() => onEdit(item)} sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}>
            <Edit2 size={14} />
          </IconButton>
          
          <IconButton 
            color="error" 
            size="small" 
            onClick={() => onRemove(item.id)}
            sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}
          >
            <X size={16} />
          </IconButton>
        </Box>
      </Paper>
    </div>
  );
};

const SubSection = ({ sc, items, onUpdateItem, onRemoveItem, onInlineAdd, onEditItem, onUpdateSub, compId, compartmentName }: any) => {
  const { setNodeRef, isOver } = useDroppable({ id: sc?.id || `root_${compId}` });
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(sc?.name || '');
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => { if (isAdding) inputRef.current?.focus(); }, [isAdding]);
  useEffect(() => { if (isEditingName) editInputRef.current?.focus(); }, [isEditingName]);

  const handleSaveName = () => {
    if (editName.trim() && editName !== sc.name) {
      onUpdateSub(sc.id, editName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <Box ref={setNodeRef} sx={{ 
      mb: 3, p: 2, borderRadius: '16px', 
      bgcolor: isOver ? 'primary.50' : 'rgba(0,0,0,0.01)',
      border: `1px solid ${isOver ? 'primary.main' : 'rgba(0,0,0,0.05)'}`,
      transition: 'all 0.2s',
      position: 'relative'
    }}>
      {isOver && (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'primary.main', opacity: 0.05, borderRadius: '16px', pointerEvents: 'none' }} />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        {sc && isEditingName ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <InputBase
              inputRef={editInputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
              sx={{ fontWeight: 800, fontSize: '1rem', borderBottom: '2px solid', borderColor: 'primary.main', flex: 1, maxWidth: 200 }}
            />
            <IconButton size="small" onClick={handleSaveName} color="primary"><Check size={16} /></IconButton>
            <IconButton size="small" onClick={() => setIsEditingName(false)}><X size={16} /></IconButton>
          </Box>
        ) : (
          <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Layout size={18} /> {sc?.name || `${compartmentName} (기본)`}
            {sc && (
              <IconButton size="small" onClick={() => { setEditName(sc.name); setIsEditingName(true); }} sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}>
                <Edit2 size={14} />
              </IconButton>
            )}
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>{items.length}</Typography>
          </Typography>
        )}
        <Button 
          size="small" 
          startIcon={isAdding ? <X size={14} /> : <Plus size={14} />}
          onClick={() => setIsAdding(!isAdding)}
          sx={{ fontWeight: 700 }}
        >
          {isAdding ? '닫기' : '빠른 추가'}
        </Button>
      </Box>

      <Stack spacing={1}>
        {isAdding && (
          <Box component="form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onInlineAdd(name.trim(), sc?.id); setName(''); } }} sx={{ mb: 1 }}>
            <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, border: '2px solid', borderColor: 'primary.main' }}>
              <InputBase 
                inputRef={inputRef}
                fullWidth 
                placeholder="식재료 이름을 입력하고 엔터를 누르세요..." 
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ ml: 1, flex: 1, fontWeight: 700 }}
              />
              <IconButton type="submit" color="primary"><Plus size={20} /></IconButton>
            </Paper>
          </Box>
        )}

        <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item: any) => (
            <SortableItemRow 
              key={item.id} 
              item={item} 
              onUpdate={onUpdateItem} 
              onRemove={onRemoveItem} 
              onEdit={onEditItem}
            />
          ))}
        </SortableContext>
        
        {items.length === 0 && !isAdding && (
          <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center', fontStyle: 'italic' }}>
            보관된 품목이 없습니다. 여기에 품목을 끌어다 놓으세요.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

const CompartmentDetail = () => {
  const { type: compId } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  
  const { items: allItems, compartments, subCompartments, removeItem, updateItem, updateCompartment, reorderItems, addItem, removeCompartment, updateSubCompartment } = useFridgeStore();
  
  const compartment = compartments.find(c => c.id === compId);
  const items = useMemo(() => 
    allItems
      .filter(i => i.compartmentId === compId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), 
    [allItems, compId]
  );
  const compSubComps = useMemo(() => subCompartments.filter(sc => sc.parentId === compId), [subCompartments, compId]);

  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempData, setTempData] = useState({ name: compartment?.name || '', warning: compartment?.warningThreshold || 7, danger: compartment?.dangerThreshold || 14 });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = useMemo(() => items.find(i => i.id === activeId), [activeId, items]);

  if (!compId || !compartment) return null;

  const handleSaveSettings = () => {
    updateCompartment(compId, { name: tempData.name, warningThreshold: tempData.warning, dangerThreshold: tempData.danger });
    setIsEditingSettings(false);
  };

  const handleDeleteComp = () => {
    if (confirm('이 칸을 정말 삭제하시겠습니까? 모든 품목도 함께 삭제됩니다.')) {
      removeCompartment(compId);
      navigate('/');
    }
  };

  const handleDragStart = (event: DragStartEvent) => { setActiveId(event.active.id as string); };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeItem = items.find(i => i.id === active.id);
    if (!activeItem) return;

    const overItem = items.find(i => i.id === over.id);
    const overSubComp = subCompartments.find(sc => sc.id === over.id);
    const isRootDrop = String(over.id).startsWith('root_');

    if (overItem) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      reorderItems(compId, arrayMove(items, oldIndex, newIndex).map(i => i.id));
      if (activeItem.subCompartmentId !== overItem.subCompartmentId) {
        updateItem(activeItem.id, { subCompartmentId: overItem.subCompartmentId });
      }
    } else if (overSubComp) {
      updateItem(activeItem.id, { subCompartmentId: overSubComp.id });
    } else if (isRootDrop) {
      updateItem(activeItem.id, { subCompartmentId: '' });
    }
  };

  const handleInlineAdd = (name: string, subCompId?: string) => {
    addItem({
      name,
      compartmentId: compId,
      subCompartmentId: subCompId,
      quantity: 1,
      unit: '개',
      category: '식재료',
      expiryDate: ''
    });
  };

  const handleEditItem = (item: FoodItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box sx={{ maxWidth: 800, mx: 'auto', pb: { xs: 12, sm: 8 } }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <IconButton 
            onClick={() => navigate('/')} 
            sx={{ 
              bgcolor: 'white', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: '#f1f5f9' }
            }}
          >
            <ArrowLeft size={22} />
          </IconButton>
          
          {isEditingSettings ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1 }}>
              <TextField
                variant="standard"
                value={tempData.name}
                onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                sx={{ '& .MuiInputBase-input': { fontSize: '1.5rem', fontWeight: 800, py: 0, width: 150 } }}
                autoFocus
              />
              <Tooltip title="경고일 설정">
                <TextField 
                  size="small" type="number" label="경고"
                  value={tempData.warning} onChange={(e) => setTempData({ ...tempData, warning: Number(e.target.value) })}
                  sx={{ width: 60, bgcolor: '#FFD93D20' }}
                />
              </Tooltip>
              <Tooltip title="위험일 설정">
                <TextField 
                  size="small" type="number" label="위험"
                  value={tempData.danger} onChange={(e) => setTempData({ ...tempData, danger: Number(e.target.value) })}
                  sx={{ width: 60, bgcolor: '#FF6B6B20' }}
                />
              </Tooltip>
              <IconButton onClick={handleSaveSettings} color="primary"><Check size={24} /></IconButton>
              <IconButton onClick={() => setIsEditingSettings(false)}><X size={24} /></IconButton>
              <IconButton onClick={handleDeleteComp} color="error"><Trash2 size={24} /></IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>
                {compartment.name}
              </Typography>
              <IconButton size="small" onClick={() => { setTempData({ name: compartment.name, warning: compartment.warningThreshold, danger: compartment.dangerThreshold }); setIsEditingSettings(true); }} sx={{ opacity: 0.5 }}>
                <Edit2 size={18} />
              </IconButton>
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 700 }}>
            총 {items.length}개의 품목
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Plus size={18} />} 
            onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} 
            sx={{ borderRadius: '12px', px: 3, fontWeight: 900, boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)' }}
          >
            품목 추가
          </Button>
        </Box>

        <Box>
          <SubSection 
            sc={null} 
            items={items.filter(i => !i.subCompartmentId)} 
            compartmentName={compartment.name}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onInlineAdd={handleInlineAdd}
            onEditItem={handleEditItem}
            compId={compId}
          />
          
          {compSubComps.map(sc => (
            <SubSection 
              key={sc.id}
              sc={sc}
              items={items.filter(i => i.subCompartmentId === sc.id)}
              compartmentName={compartment.name}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onInlineAdd={handleInlineAdd}
              onEditItem={handleEditItem}
              onUpdateSub={updateSubCompartment}
              compId={compId}
            />
          ))}
        </Box>

        <AddItemDialog 
          open={isDialogOpen} 
          onClose={() => { setIsDialogOpen(false); setEditingItem(null); }} 
          defaultCompartmentId={compId}
          initialItem={editingItem || undefined}
        />

        <DragOverlay>
          {activeId && activeItem ? (
            <Paper sx={{ p: 2, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: 300, border: '2px solid', borderColor: 'primary.main' }}>
              <Typography sx={{ fontWeight: 900 }}>{activeItem.name}</Typography>
            </Paper>
          ) : null}
        </DragOverlay>
      </Box>
    </DndContext>
  );
};

export default CompartmentDetail;
