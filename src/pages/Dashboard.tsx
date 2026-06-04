import { 
  Typography, Box, Button, Chip, Stack, Card, CardContent,
  TextField, IconButton, InputBase, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
  Checkbox, Paper, Tooltip, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Refrigerator, Snowflake, Waves, Layers, Plus, 
  Carrot, Apple, Droplets, Edit2, Check, X, Layout, ShoppingCart, Trash2, Users, LogOut, Utensils, ExternalLink,
  Sparkles, ChevronRight, TrendingUp
} from 'lucide-react';
import { 
  DndContext, useDroppable, DragOverlay,
  type DragEndEvent, type DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  pointerWithin
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFridgeStore } from '../store/useFridgeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLedgerStore } from '../store/useLedgerStore';
import type { FoodItem, Compartment, Recipe, ShoppingItem } from '../types/index';
import AddItemDialog from '../components/AddItemDialog';
import ShareDialog from '../components/ShareDialog';
import { Link } from 'react-router-dom';

const ICON_MAP: Record<string, any> = { Refrigerator, Snowflake, Waves, Layers, Carrot, Apple, Droplets, Layout, Users };

const getItemColor = (item: FoodItem, comp: Compartment) => {
  const addedAt = item.addedAt;
  const warning = item.warningThreshold ?? comp.warningThreshold;
  const danger = item.dangerThreshold ?? comp.dangerThreshold;
  
  if (!addedAt) return 'rgba(0,0,0,0.03)';
  const addedDate = new Date(addedAt);
  if (isNaN(addedDate.getTime())) return 'rgba(0,0,0,0.03)';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= danger) return '#FF6B6B';
  if (diffDays >= warning) return '#FFD93D';
  return 'rgba(0,0,0,0.03)';
};

const SortableItemChip = ({ item, comp, onDelete, onEdit }: { item: FoodItem, comp: Compartment, onDelete: (id: string) => void, onEdit: (item: FoodItem) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 1000 : 1 };
  const bgColor = getItemColor(item, comp);
  const isAlert = bgColor !== 'rgba(0,0,0,0.03)';
  return (
    <div ref={setNodeRef} style={style}>
      <Chip 
        label={item.name} 
        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
        onDelete={(e) => { e.stopPropagation(); onDelete(item.id); }} 
        deleteIcon={<X size={10} />} 
        size="small" 
        {...attributes} 
        {...listeners}
        sx={{ 
          height: 18, fontSize: '0.6rem', bgcolor: bgColor, color: isAlert ? '#000' : 'inherit', border: isAlert ? 'none' : '1px solid rgba(0,0,0,0.05)', fontWeight: isAlert ? 800 : 600, 
          cursor: 'grab', '&:active': { cursor: 'grabbing' }, 
          '& .MuiChip-label': { px: 0.5 }, '& .MuiChip-deleteIcon': { fontSize: 8, color: isAlert ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)', '&:hover': { color: 'error.main' } },
          touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none'
        }} 
      />
    </div>
  );
};

const SubCompartmentSection = ({ sc, items, comp, onDeleteItem, onRemoveSub, onInlineAdd, onEditItem }: any) => {
  const { setNodeRef, isOver } = useDroppable({ id: sc.id });
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isAdding) inputRef.current?.focus(); }, [isAdding]);

  return (
    <Box ref={setNodeRef} sx={{ 
      pl: 1, 
      borderLeft: `2px solid ${isOver ? comp.color : comp.color + '20'}`, 
      bgcolor: isOver ? `${comp.color}08` : 'transparent', 
      transition: 'all 0.2s', 
      py: 0.5, 
      borderRadius: '0 8px 8px 0',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 60 }}>
        <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
          {sc.name}
        </Typography>
        <Stack direction="row">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding); }} sx={{ p: 0.2, opacity: 0.5 }}><Plus size={10} /></IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); if(confirm('이 세부칸을 삭제하시겠습니까?')) onRemoveSub(sc.id); }} sx={{ p: 0.2, opacity: 0.3, '&:hover': { opacity: 1 } }}><Trash2 size={10} /></IconButton>
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
        <SortableContext items={(items || []).map((i: any) => i.id)} strategy={rectSortingStrategy}>
          {(items || []).map((item: any) => <SortableItemChip key={item.id} item={item} comp={comp} onDelete={onDeleteItem} onEdit={onEditItem} />)}
        </SortableContext>
        
        {isAdding && (
          <Box 
            component="form" 
            onSubmit={(e) => { 
              e.preventDefault(); 
              if (name.trim()) { 
                onInlineAdd(name.trim(), comp.id, sc.id); 
                setName(''); 
              } 
            }} 
            onClick={(e) => e.stopPropagation()} 
            sx={{ display: 'inline-flex' }}
          >
            <InputBase 
              inputRef={inputRef} 
              size="small" 
              placeholder="품목..." 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Escape') setIsAdding(false); }}
              onBlur={() => !name && setIsAdding(false)} 
              sx={{ 
                fontSize: '0.65rem', 
                borderBottom: `1px solid ${comp.color}`, 
                px: 0.5,
                fontWeight: 700,
                width: 80
              }} 
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface CompartmentCardProps {
  comp: Compartment;
  items: FoodItem[];
  subComps: any[];
  onNavigate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: FoodItem) => void;
  onInlineAdd: (name: string, compId: string, scId?: string) => void;
  onUpdateThresholds: (id: string, warning: number, danger: number) => void;
  onAddSub: (compId: string, name: string) => void;
  onRemoveSub: (subId: string) => void;
  onRemoveComp: (id: string) => void;
}

const CompartmentCard = ({ comp, items, subComps, onNavigate, onRename, onDeleteItem, onEditItem, onInlineAdd, onUpdateThresholds, onAddSub, onRemoveSub, onRemoveComp }: CompartmentCardProps) => {
  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({ id: `root_${comp.id}` });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: comp.name, warning: comp.warningThreshold, danger: comp.dangerThreshold });
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = ICON_MAP[comp.iconName] || Layout;
  
  useEffect(() => { if (isAdding && inputRef.current) inputRef.current.focus(); }, [isAdding]);
  const handleAddSubmit = (e?: any) => { e?.preventDefault(); if (newItemName.trim()) { onInlineAdd(newItemName.trim(), comp.id); setNewItemName(''); } };
  
  return (
    <Box sx={{ height: '100%' }}>
      <motion.div whileHover={{ y: -2 }} style={{ height: '100%' }}>
        <Card 
          ref={setRootDropRef}
          onClick={() => !isEditing && !isAdding && !isAddingSub && onNavigate(comp.id)} 
          sx={{ 
            cursor: 'pointer', 
            position: 'relative', 
            overflow: 'visible', 
            border: isRootOver ? `2px dashed ${comp.color}` : '1px solid rgba(0,0,0,0.08)', 
            bgcolor: isRootOver ? `${comp.color}05` : 'white', 
            height: '100%', 
            minHeight: comp.gridSpan === 12 ? 140 : 110, 
            transition: 'all 0.2s', 
            borderRadius: '16px', 
            boxShadow: isRootOver ? `0 0 15px ${comp.color}20` : '0 4px 20px rgba(0,0,0,0.05)' 
          }}
        >
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Box sx={{ p: 0.6, borderRadius: '8px', bgcolor: `${comp.color}15`, color: comp.color, display: 'flex' }}><Icon size={18} /></Box>
                {isEditing ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flex: 1, minWidth: 0 }}>
                    <InputBase value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} onClick={(e) => e.stopPropagation()} sx={{ fontWeight: 900, fontSize: '0.85rem', width: 'auto', flex: 1, borderBottom: '1px solid #ccc', minWidth: 40 }} />
                    <Tooltip title="경고: 보관일이 이 일수를 넘으면 노란색으로 표시됩니다." arrow>
                      <InputBase type="number" value={editData.warning} onChange={(e) => setEditData({ ...editData, warning: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} sx={{ fontSize: '0.75rem', width: 28, bgcolor: '#FFD93D', borderRadius: '4px', px: 0.3 }} />
                    </Tooltip>
                    <Tooltip title="위험: 보관일이 이 일수를 넘으면 빨간색으로 표시됩니다." arrow>
                      <InputBase type="number" value={editData.danger} onChange={(e) => setEditData({ ...editData, danger: Number(e.target.value) })} onClick={(e) => e.stopPropagation()} sx={{ fontSize: '0.75rem', width: 28, bgcolor: '#FF6B6B', borderRadius: '4px', px: 0.3 }} />
                    </Tooltip>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRename(comp.id, editData.name); onUpdateThresholds(comp.id, editData.warning, editData.danger); setIsEditing(false); }} sx={{ p: 0.2 }} color="primary"><Check size={14} /></IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); if(confirm('이 칸을 삭제하시겠습니까?')) onRemoveComp(comp.id); }} sx={{ p: 0.2 }} color="error"><Trash2 size={14} /></IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, fontSize: '1rem', letterSpacing: -0.3 }}>{comp.name}</Typography>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditData({ name: comp.name, warning: comp.warningThreshold, danger: comp.dangerThreshold }); setIsEditing(true); }} sx={{ p: 0.2, opacity: 0.2, '&:hover': { opacity: 1 } }}><Edit2 size={12} /></IconButton>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setIsAddingSub(true); }} sx={{ p: 0.4, opacity: 0.6 }}><Layout size={16} /></IconButton>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setIsAdding(true); }} sx={{ p: 0.4, bgcolor: 'rgba(0,0,0,0.03)' }}><Plus size={16} /></IconButton>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 900, fontSize: '0.8rem', ml: 0.5 }}>{(items || []).length}</Typography>
              </Box>
            </Box>

            <Stack spacing={1}>
              {(subComps || []).map((sc: any) => (
                <SubCompartmentSection key={sc.id} sc={sc} comp={comp} items={(items || []).filter((i: any) => i.subCompartmentId === sc.id)} onDeleteItem={onDeleteItem} onEditItem={onEditItem} onRemoveSub={onRemoveSub} onInlineAdd={onInlineAdd} />
              ))}
              
              <Box sx={{ 
                display: 'flex', gap: 0.5, flexWrap: 'wrap', minHeight: 24, 
                bgcolor: 'transparent',
                borderRadius: '8px',
                transition: 'all 0.2s', p: 0.2
              }}>
                <SortableContext items={(items || []).filter((i:any) => !i.subCompartmentId).map((i:any) => i.id)} strategy={rectSortingStrategy}>
                  {(items || []).filter((i:any) => !i.subCompartmentId).map((item:any) => <SortableItemChip key={item.id} item={item} comp={comp} onDelete={onDeleteItem} onEdit={onEditItem} />)}
                </SortableContext>
              </Box>

              {isAdding && <Box component="form" onSubmit={handleAddSubmit} onClick={(e) => e.stopPropagation()} sx={{ mt: 0.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '8px', px: 1, py: 0.5, border: `1px solid ${comp.color}50` }}><InputBase inputRef={inputRef} fullWidth placeholder="식재료 입력..." value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubmit(); } if (e.key === 'Escape') setIsAdding(false); }} onBlur={() => !newItemName && setIsAdding(false)} sx={{ fontSize: '0.8rem', fontWeight: 600 }} /></Box>}
              {isAddingSub && <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}><TextField size="small" placeholder="세부칸 이름" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onClick={(e) => e.stopPropagation()} sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }} /><IconButton size="small" onClick={(e) => { e.stopPropagation(); if (newSubName) onAddSub(comp.id, newSubName); setNewSubName(''); setIsAddingSub(false); }} sx={{ p: 0.3 }}><Check size={14} /></IconButton><IconButton size="small" onClick={(e) => { e.stopPropagation(); setIsAddingSub(false); }} sx={{ p: 0.3 }}><X size={14} /></IconButton></Box>}
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

const SortableShoppingItem = ({ item, onToggle, onRemove }: { item: ShoppingItem, onToggle: (id: string) => void, onRemove: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 1000 : 1 };
  
  return (
    <Box ref={setNodeRef} style={style} sx={{ flexGrow: 0, flexShrink: 0, flexBasis: { xs: 'calc(33.33% - 8px)', sm: 'calc(25% - 8px)', md: 'calc(16.66% - 8px)' }, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <Paper elevation={0} sx={{ p: 0.3, pl: 0.5, borderRadius: '5px', display: 'flex', alignItems: 'center', border: '1px solid rgba(0,0,0,0.03)', bgcolor: item.completed ? 'rgba(0,0,0,0.01)' : 'white' }}>
        <Checkbox size="small" checked={item.completed} onChange={() => onToggle(item.id)} sx={{ p: 0.1 }} />
        <Typography noWrap {...attributes} {...listeners} sx={{ flex: 1, fontSize: '0.6rem', fontWeight: 700, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'text.disabled' : 'text.primary', cursor: 'grab' }}>
          {item.name}
        </Typography>
        <IconButton size="small" onClick={() => onRemove(item.id)} sx={{ p: 0.1, opacity: 0.2 }}><X size={8} /></IconButton>
      </Paper>
    </Box>
  );
};

const ShoppingList = () => {
  const { shoppingList, addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCompletedShopping } = useFridgeStore();
  const [inputValue, setInputValue] = useState('');
  const sortedList = useMemo(() => [...(shoppingList || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), [shoppingList]);
  
  const handleAdd = (e?: any) => { 
    e?.preventDefault(); 
    if (inputValue.trim()) { 
      addShoppingItem(inputValue.trim()); 
      setInputValue(''); 
    } 
  };

  return (
    <Box sx={{ mt: 1.5, p: 1, bgcolor: '#f1f3f5', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ShoppingCart size={12} /> 장보기
        </Typography>
        <Button size="small" onClick={clearCompletedShopping} sx={{ fontSize: '0.58rem', minWidth: 0, p: 0 }}>정리</Button>
      </Box>
      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <InputBase 
          placeholder="품목 추가..." 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          sx={{ flex: 1, bgcolor: 'white', px: 1, py: 0.1, borderRadius: '5px', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.65rem' }} 
        />
        <Button variant="contained" type="submit" size="small" sx={{ minWidth: 35, fontSize: '0.6rem', borderRadius: '5px', py: 0.1 }}>추가</Button>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <SortableContext items={sortedList.map(i => i.id)} strategy={rectSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {sortedList.map((item: ShoppingItem) => (
              <SortableShoppingItem key={item.id} item={item} onToggle={toggleShoppingItem} onRemove={removeShoppingItem} />
            ))}
          </AnimatePresence>
        </SortableContext>
      </Box>
    </Box>
  );
};

const SortableRecipeItem = ({ recipe, onRemove }: { recipe: Recipe, onRemove: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: recipe.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 1000 : 1 };

  return (
    <Box ref={setNodeRef} style={style} sx={{ flexGrow: 0, flexShrink: 0, flexBasis: { xs: 'calc(50% - 4px)', sm: 'calc(33.33% - 8px)', md: 'calc(20% - 8px)' }, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <Paper elevation={0} sx={{ p: 0.8, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 0.8, border: '1px solid rgba(230,126,34,0.1)', bgcolor: 'white' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap {...attributes} {...listeners} sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#2c3e50', cursor: 'grab' }}>
            {recipe.name}
          </Typography>
          {recipe.link && (
            <Typography 
              component="a" 
              href={recipe.link} 
              target="_blank" 
              sx={{ fontSize: '0.55rem', color: '#e67e22', display: 'flex', alignItems: 'center', gap: 0.2, textDecoration: 'none', mt: 0.1, '&:hover': { textDecoration: 'underline' } }}
            >
              <ExternalLink size={8} /> 레시피
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={() => onRemove(recipe.id)} sx={{ p: 0.3, color: 'rgba(0,0,0,0.15)', '&:hover': { color: 'error.main' } }}>
          <Trash2 size={10} />
        </IconButton>
      </Paper>
    </Box>
  );
};

const RecipeList = () => {
  const { recipes, addRecipe, removeRecipe } = useFridgeStore();
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const sortedRecipes = useMemo(() => [...(recipes || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), [recipes]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      addRecipe({ name: name.trim(), link: link.trim() || undefined });
      setName('');
      setLink('');
      setShowAdd(false);
    }
  };

  return (
    <Box sx={{ mt: 2, p: 1, bgcolor: '#fff9f0', borderRadius: '12px', border: '1px solid rgba(255,159,67,0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.5, color: '#e67e22' }}>
          <Utensils size={14} /> 오늘 뭐 먹지? ({(recipes || []).length})
        </Typography>
        <Button 
          size="small" 
          onClick={() => setShowAdd(!showAdd)} 
          startIcon={showAdd ? <X size={12} /> : <Plus size={12} />}
          sx={{ fontSize: '0.65rem', minWidth: 0, color: '#e67e22' }}
        >
          {showAdd ? '닫기' : '추가'}
        </Button>
      </Box>

      {showAdd && (
        <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2, p: 1.5, bgcolor: 'white', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
          <TextField 
            fullWidth 
            size="small" 
            placeholder="요리 이름 (예: 김치찌개)" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
          />
          <TextField 
            fullWidth 
            size="small" 
            placeholder="레시피 링크 (선택사항)" 
            value={link} 
            onChange={(e) => setLink(e.target.value)}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
          />
          <Button variant="contained" type="submit" size="small" sx={{ bgcolor: '#e67e22', '&:hover': { bgcolor: '#d35400' } }}>
            저장하기
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <SortableContext items={sortedRecipes.map(r => r.id)} strategy={rectSortingStrategy}>
          {sortedRecipes.map((recipe: Recipe) => (
            <SortableRecipeItem key={recipe.id} recipe={recipe} onRemove={removeRecipe} />
          ))}
        </SortableContext>
      </Box>
      
      {(recipes || []).length === 0 && !showAdd && (
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', py: 2, color: 'text.disabled', fontStyle: 'italic' }}>
          만들어보고 싶은 요리를 추가해보세요!
        </Typography>
      )}
    </Box>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [thresholdEditItem, setThresholdEditItem] = useState<FoodItem | null>(null);
  const [itemEditData, setItemEditData] = useState({ name: '', addedAt: '', warning: 0, danger: 0, compartmentId: '', subCompartmentId: '' });

  const { 
    items, compartments, subCompartments, shoppingList, recipes, weeklyMenu,
    addItem, removeItem, reorderItems, addCompartment, updateCompartment, 
    updateItem, addSubCompartment, removeSubCompartment, removeCompartment,
    reorderShoppingList, reorderRecipes
  } = useFridgeStore();
  const { expenses } = useLedgerStore();

  const handleEditItemThreshold = (item: FoodItem) => {
    const comp = compartments.find(c => c.id === item.compartmentId);
    setThresholdEditItem(item);
    setItemEditData({
      name: item.name,
      addedAt: item.addedAt ? item.addedAt.split('T')[0] : new Date().toISOString().split('T')[0],
      warning: item.warningThreshold ?? comp?.warningThreshold ?? 7,
      danger: item.dangerThreshold ?? comp?.dangerThreshold ?? 14,
      compartmentId: item.compartmentId,
      subCompartmentId: item.subCompartmentId || ''
    });
  };

  const handleSaveItemThreshold = () => {
    if (thresholdEditItem) {
      updateItem(thresholdEditItem.id, {
        name: itemEditData.name,
        addedAt: itemEditData.addedAt,
        warningThreshold: itemEditData.warning,
        dangerThreshold: itemEditData.danger,
        compartmentId: itemEditData.compartmentId,
        subCompartmentId: itemEditData.subCompartmentId || ''
      });
      setThresholdEditItem(null);
    }
  };

  const filteredSubComps = useMemo(() => {
    return subCompartments.filter(sc => sc.parentId === itemEditData.compartmentId);
  }, [subCompartments, itemEditData.compartmentId]);

  const daysPassed = useMemo(() => {
    if (!itemEditData.addedAt) return 0;
    const addedDate = new Date(itemEditData.addedAt);
    const now = new Date();
    addedDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - addedDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [itemEditData.addedAt]);

  const today = useMemo(() => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[new Date().getDay()];
  }, []);

  const todayMenu = useMemo(() => {
    const hour = new Date().getHours();
    let type: 'breakfast' | 'lunch' | 'dinner' = 'breakfast';
    let label = '아침';
    let color = 'success.main';
    
    if (hour >= 10 && hour < 16) {
      type = 'lunch';
      label = '점심';
      color = 'primary.main';
    } else if (hour >= 16) {
      type = 'dinner';
      label = '저녁';
      color = 'error.main';
    }

    const meal = (weeklyMenu || []).find(m => m.day === today && m.id.includes(`_${type}`));
    return { meal, label, color };
  }, [weeklyMenu, today]);

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const activeItem = useMemo(() => items.find(i => i.id === activeId), [activeId, items]);
  const activeShoppingItem = useMemo(() => shoppingList.find(i => i.id === activeId), [activeId, shoppingList]);
  const activeRecipe = useMemo(() => recipes.find(i => i.id === activeId), [activeId, recipes]);

  const handleDragStart = (event: DragStartEvent) => { setActiveId(event.active.id as string); };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    // Check if it's a FoodItem
    const activeFoodItem = items.find(i => i.id === active.id);
    if (activeFoodItem) {
      const overItem = items.find(i => i.id === over.id);
      const overComp = compartments.find(c => c.id === over.id);
      const overSubComp = subCompartments.find(sc => sc.id === over.id);
      const isRootDrop = String(over.id).startsWith('root_');
      
      if (overItem) {
        if (activeFoodItem.compartmentId === overItem.compartmentId) {
          const compItems = items.filter(i => i.compartmentId === activeFoodItem.compartmentId).sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          const oldIndex = compItems.findIndex(i => i.id === active.id);
          const newIndex = compItems.findIndex(i => i.id === over.id);
          reorderItems(activeFoodItem.compartmentId, arrayMove(compItems, oldIndex, newIndex).map(i => i.id));
          if (activeFoodItem.subCompartmentId !== overItem.subCompartmentId) { 
            updateItem(activeFoodItem.id, { subCompartmentId: overItem.subCompartmentId }); 
          }
        } else { 
          updateItem(activeFoodItem.id, { compartmentId: overItem.compartmentId, subCompartmentId: overItem.subCompartmentId }); 
        }
      } else if (overSubComp) { 
        updateItem(activeFoodItem.id, { compartmentId: overSubComp.parentId, subCompartmentId: overSubComp.id });
      } else if (isRootDrop) {
        const compId = String(over.id).replace('root_', '');
        updateItem(activeFoodItem.id, { compartmentId: compId, subCompartmentId: undefined });
      } else if (overComp) { 
        updateItem(activeFoodItem.id, { compartmentId: overComp.id, subCompartmentId: undefined }); 
      }
      return;
    }

    // Check if it's a ShoppingItem
    const shoppingIds = shoppingList.map(i => i.id);
    if (shoppingIds.includes(active.id as string)) {
      const oldIndex = shoppingIds.indexOf(active.id as string);
      const newIndex = shoppingIds.indexOf(over.id as string);
      if (newIndex !== -1) {
        reorderShoppingList(arrayMove(shoppingList.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)), oldIndex, newIndex).map(i => i.id));
      }
      return;
    }

    // Check if it's a Recipe
    const recipeIds = recipes.map(i => i.id);
    if (recipeIds.includes(active.id as string)) {
      const oldIndex = recipeIds.indexOf(active.id as string);
      const newIndex = recipeIds.indexOf(over.id as string);
      if (newIndex !== -1) {
        reorderRecipes(arrayMove(recipes.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)), oldIndex, newIndex).map(i => i.id));
      }
      return;
    }
  };

  const [newComp, setNewComp] = useState({ name: '', type: 'veggies', iconName: 'Layout', color: '#6366f1', gridSpan: 4, warningThreshold: 7, dangerThreshold: 14 });
  const fridgeComp = compartments.find(c => c.type === 'fridge');
  const freezerComp = compartments.find(c => c.type === 'freezer');
  const otherMainComps = compartments.filter(c => ['sauces', 'veggies', 'fruits'].includes(c.type)).sort((a,b) => a.order - b.order);
  const kimchiComps = compartments.filter(c => ['kimchi1', 'kimchi2'].includes(c.type)).sort((a,b) => a.order - b.order);
  const extraGroup = compartments.filter(c => !['fridge', 'freezer', 'sauces', 'veggies', 'fruits', 'kimchi1', 'kimchi2'].includes(c.type)).sort((a,b) => a.order - b.order);

  const getSortedItems = (compId: string) => items.filter(i => i.compartmentId === compId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1, sm: 1.5 } }}>
        <Box sx={{ 
          mb: 1.5, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.dark', letterSpacing: -0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>우리집 냉장고</Typography>
              <Chip 
                label={useAuthStore.getState().profile?.householdId ? "클라우드" : "연결중..."} 
                size="small" 
                color={useAuthStore.getState().profile?.householdId ? "success" : "warning"} 
                variant="outlined"
                sx={{ height: 14, fontSize: '0.5rem', fontWeight: 900 }}
              />
            </Box>
            <IconButton size="small" color="error" onClick={() => signOut()} sx={{ display: { xs: 'flex', sm: 'none' }, bgcolor: 'error.50' }}>
              <LogOut size={14} />
            </IconButton>
          </Box>
          
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <Button size="small" variant="outlined" startIcon={<Users size={12} />} onClick={() => setIsShareOpen(true)} sx={{ borderRadius: '6px', fontSize: '0.65rem', py: 0.3, flex: { xs: 1, sm: 'none' } }}>공유</Button>
            <Button size="small" variant="outlined" startIcon={<Layout size={12} />} onClick={() => setIsCompDialogOpen(true)} sx={{ borderRadius: '6px', fontSize: '0.65rem', py: 0.3, flex: { xs: 1, sm: 'none' } }}>칸 추가</Button>
            <Button size="small" variant="contained" startIcon={<Plus size={12} />} onClick={() => setIsDialogOpen(true)} sx={{ borderRadius: '6px', fontSize: '0.65rem', py: 0.3, fontWeight: 800, flex: { xs: 1.2, sm: 'none' } }}>품목 추가</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<LogOut size={12} />} onClick={() => signOut()} sx={{ display: { xs: 'none', sm: 'flex' }, borderRadius: '6px', fontSize: '0.65rem', py: 0.3 }}>로그아웃</Button>
          </Stack>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1.2, mb: 1.5 }}>
          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Card 
              component={Link}
              to="/ledger"
              sx={{ 
                height: '100%',
                borderRadius: 3, 
                textDecoration: 'none',
                background: 'rgba(74, 144, 226, 0.05)',
                border: '1px solid rgba(74, 144, 226, 0.1)',
                color: 'primary.main',
                transition: 'all 0.2s',
                '&:hover': { background: 'rgba(74, 144, 226, 0.08)', transform: 'translateY(-2px)' }
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                    <TrendingUp size={14} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>이번 달 생활비</Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.1rem', color: 'primary.dark' }}>
                    {monthlyTotal.toLocaleString()}원
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Paper 
              onClick={() => navigate('/meal-plan')}
              sx={{ 
                height: '100%',
                p: 1.5, 
                borderRadius: 3, 
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
                border: '1px solid #dbeafe',
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.12)' }
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <Utensils size={14} color="#3b82f6" />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>오늘의 {todayMenu.label}</Typography>
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.1rem', color: todayMenu.color }}>
                  {todayMenu.meal?.menu || '메뉴 미정'}
                </Typography>
              </Stack>
            </Paper>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1.5 }}>
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 7' } }}>
            <Typography variant="overline" sx={{ fontWeight: 900, mb: 0.5, display: 'block', color: 'primary.main', fontSize: '0.7rem', lineHeight: 1 }}>냉장고</Typography>
            <Stack spacing={1}>
              {fridgeComp && <CompartmentCard comp={fridgeComp} items={getSortedItems(fridgeComp.id)} subComps={subCompartments.filter(sc => sc.parentId === fridgeComp.id)} onNavigate={(id:string) => navigate(`/compartment/${id}`)} onRename={(id:string, name:string) => updateCompartment(id, { name })} onDeleteItem={removeItem} onEditItem={handleEditItemThreshold} onUpdateThresholds={(id:string, w:number, d:number) => updateCompartment(id, { warningThreshold: w, dangerThreshold: d })} onInlineAdd={(n:string, cid:string, scid?:string) => addItem({ name: n, compartmentId: cid, subCompartmentId: scid, quantity: 1, category: '기타', unit: '개', expiryDate: '' })} onAddSub={addSubCompartment} onRemoveSub={removeSubCompartment} onRemoveComp={removeCompartment} />}
              {freezerComp && <CompartmentCard comp={freezerComp} items={getSortedItems(freezerComp.id)} subComps={subCompartments.filter(sc => sc.parentId === freezerComp.id)} onNavigate={(id:string) => navigate(`/compartment/${id}`)} onRename={(id:string, name:string) => updateCompartment(id, { name })} onDeleteItem={removeItem} onEditItem={handleEditItemThreshold} onUpdateThresholds={(id:string, w:number, d:number) => updateCompartment(id, { warningThreshold: w, dangerThreshold: d })} onInlineAdd={(n:string, cid:string, scid?:string) => addItem({ name: n, compartmentId: cid, subCompartmentId: scid, quantity: 1, category: '기타', unit: '개', expiryDate: '' })} onAddSub={addSubCompartment} onRemoveSub={removeSubCompartment} onRemoveComp={removeCompartment} />}
              <Box sx={{ 
                display: { xs: 'flex', sm: 'grid' },
                gridTemplateColumns: { sm: 'repeat(3, 1fr)' },
                gap: 1.5, 
                overflowX: { xs: 'auto', sm: 'visible' },
                scrollSnapType: { xs: 'x mandatory', sm: 'none' },
                pb: { xs: 1, sm: 0 },
                mx: { xs: -1.5, sm: 0 },
                px: { xs: 1.5, sm: 0 },
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}>
                {otherMainComps.map(comp => (
                  <Box 
                    key={comp.id} 
                    sx={{ 
                      flex: { xs: '0 0 85%', sm: 'unset' },
                      scrollSnapAlign: 'start',
                      minWidth: 0
                    }}
                  >
                    <CompartmentCard comp={comp} items={getSortedItems(comp.id)} subComps={subCompartments.filter(sc => sc.parentId === comp.id)} onNavigate={(id:string) => navigate(`/compartment/${id}`)} onRename={(id:string, name:string) => updateCompartment(id, { name })} onDeleteItem={removeItem} onEditItem={handleEditItemThreshold} onUpdateThresholds={(id:string, w:number, d:number) => updateCompartment(id, { warningThreshold: w, dangerThreshold: d })} onInlineAdd={(n:string, cid:string, scid?:string) => addItem({ name: n, compartmentId: cid, subCompartmentId: scid, quantity: 1, category: '기타', unit: '개', expiryDate: '' })} onAddSub={addSubCompartment} onRemoveSub={removeSubCompartment} onRemoveComp={removeCompartment} />
                  </Box>
                ))}
              </Box>
            </Stack>
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
            <Typography variant="overline" sx={{ fontWeight: 900, mb: 0.5, display: 'block', color: 'error.main', fontSize: '0.7rem', lineHeight: 1 }}>김치 냉장고</Typography>
            <Stack spacing={1}>
              <Box sx={{ 
                display: { xs: 'flex', sm: 'flex' }, 
                flexDirection: { xs: 'row', sm: 'column' },
                gap: 1.5,
                overflowX: { xs: 'auto', sm: 'visible' },
                scrollSnapType: { xs: 'x mandatory', sm: 'none' },
                pb: { xs: 1, sm: 0 },
                mx: { xs: -1.5, sm: 0 },
                px: { xs: 1.5, sm: 0 },
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}>
                {kimchiComps.map(comp => (
                  <Box key={comp.id} sx={{ flex: { xs: '0 0 85%', sm: 'unset' }, scrollSnapAlign: 'start', minWidth: 0 }}>
                    <CompartmentCard comp={comp} items={getSortedItems(comp.id)} subComps={subCompartments.filter(sc => sc.parentId === comp.id)} onNavigate={(id:string) => navigate(`/compartment/${id}`)} onRename={(id:string, name:string) => updateCompartment(id, { name })} onDeleteItem={removeItem} onEditItem={handleEditItemThreshold} onUpdateThresholds={(id:string, w:number, d:number) => updateCompartment(id, { warningThreshold: w, dangerThreshold: d })} onInlineAdd={(n:string, cid:string, scid?:string) => addItem({ name: n, compartmentId: cid, subCompartmentId: scid, quantity: 1, category: '기타', unit: '개', expiryDate: '' })} onAddSub={addSubCompartment} onRemoveSub={removeSubCompartment} onRemoveComp={removeCompartment} />
                  </Box>
                ))}
              </Box>

              {extraGroup.length > 0 && (
                <>
                  <Typography variant="overline" sx={{ fontWeight: 900, mt: 0.5, display: 'block', fontSize: '0.6rem' }}>추가 보관</Typography>
                  <Box sx={{ 
                    display: { xs: 'flex', sm: 'flex' }, 
                    flexDirection: { xs: 'row', sm: 'column' },
                    gap: 1.5,
                    overflowX: { xs: 'auto', sm: 'visible' },
                    scrollSnapType: { xs: 'x mandatory', sm: 'none' },
                    pb: { xs: 1, sm: 0 },
                    mx: { xs: -1.5, sm: 0 },
                    px: { xs: 1.5, sm: 0 },
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                  }}>
                    {extraGroup.map(comp => (
                      <Box key={comp.id} sx={{ flex: { xs: '0 0 85%', sm: 'unset' }, scrollSnapAlign: 'start', minWidth: 0 }}>
                        <CompartmentCard comp={comp} items={getSortedItems(comp.id)} subComps={subCompartments.filter(sc => sc.parentId === comp.id)} onNavigate={(id:string) => navigate(`/compartment/${id}`)} onRename={(id:string, name:string) => updateCompartment(id, { name })} onDeleteItem={removeItem} onEditItem={handleEditItemThreshold} onUpdateThresholds={(id:string, w:number, d:number) => updateCompartment(id, { warningThreshold: w, dangerThreshold: d })} onInlineAdd={(n:string, cid:string, scid?:string) => addItem({ name: n, compartmentId: cid, subCompartmentId: scid, quantity: 1, category: '기타', unit: '개', expiryDate: '' })} onAddSub={addSubCompartment} onRemoveSub={removeSubCompartment} onRemoveComp={removeCompartment} />
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Stack>
          </Box>
        </Box>

        <ShoppingList />
        <RecipeList />

        <DragOverlay>
          {activeId && activeItem ? (
            <Chip label={activeItem.name} size="small" sx={{ borderRadius: '5px', bgcolor: 'primary.main', color: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '0.6rem' }} />
          ) : activeId && activeShoppingItem ? (
            <Paper elevation={4} sx={{ p: 0.3, pl: 0.5, borderRadius: '5px', display: 'flex', alignItems: 'center', border: '1px solid rgba(0,0,0,0.1)', bgcolor: 'white' }}>
              <Checkbox size="small" checked={activeShoppingItem.completed} sx={{ p: 0.1 }} />
              <Typography sx={{ flex: 1, fontSize: '0.6rem', fontWeight: 800 }}>{activeShoppingItem.name}</Typography>
            </Paper>
          ) : activeId && activeRecipe ? (
            <Paper elevation={4} sx={{ p: 0.8, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 0.8, border: '1px solid rgba(230,126,34,0.3)', bgcolor: 'white' }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: '#2c3e50' }}>{activeRecipe.name}</Typography>
            </Paper>
          ) : null}
        </DragOverlay>

        <Dialog open={isCompDialogOpen} onClose={() => setIsCompDialogOpen(false)}>
          <DialogTitle sx={{ fontWeight: 900, fontSize: '1rem' }}>새 칸 추가</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 1, minWidth: { xs: 260, sm: 300 } }}>
              <TextField label="칸 이름" fullWidth size="small" value={newComp.name} onChange={(e) => setNewComp({ ...newComp, name: e.target.value })} autoFocus />
              
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mb: 0.2, display: 'block' }}>위치 선택</Typography>
                <RadioGroup 
                  row 
                  value={['veggies', 'sauces', 'fruits'].includes(newComp.type) ? 'fridge' : ['kimchi1', 'kimchi2'].includes(newComp.type) ? 'kimchi' : 'extra'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewComp({ ...newComp, type: val === 'fridge' ? 'veggies' : val === 'kimchi' ? 'kimchi1' : 'custom' });
                  }}
                >
                  <FormControlLabel value="fridge" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontWeight: 700 }}>냉장고</Typography>} />
                  <FormControlLabel value="kimchi" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontWeight: 700 }}>김치냉장고</Typography>} />
                  <FormControlLabel value="extra" control={<Radio size="small" />} label={<Typography variant="caption" sx={{ fontWeight: 700 }}>추가보관</Typography>} />
                </RadioGroup>
              </Box>

              <Stack direction="row" spacing={1}>
                <FormControl fullWidth size="small">
                  <InputLabel>아이콘</InputLabel>
                  <Select value={newComp.iconName} label="아이콘" onChange={(e) => setNewComp({ ...newComp, iconName: e.target.value })}>
                    {Object.keys(ICON_MAP).map(icon => <MenuItem key={icon} value={icon} sx={{ fontSize: '0.75rem' }}>{icon}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="색상" fullWidth size="small" value={newComp.color} onChange={(e) => setNewComp({ ...newComp, color: e.target.value })} type="color" sx={{ width: 80, '& .MuiInputBase-root': { p: 0, height: 32 } }} />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 1.5 }}>
            <Button onClick={() => setIsCompDialogOpen(false)} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>취소</Button>
            <Button onClick={() => { addCompartment(newComp); setIsCompDialogOpen(false); }} variant="contained" sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.75rem' }}>추가하기</Button>
          </DialogActions>
        </Dialog>
        
        <AddItemDialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
        <ShareDialog open={isShareOpen} onClose={() => setIsShareOpen(false)} />

        <Dialog open={Boolean(thresholdEditItem)} onClose={() => setThresholdEditItem(null)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main' }} />
            품목 정보 및 알림 설정
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField 
                label="품목 이름" 
                fullWidth 
                size="small" 
                value={itemEditData.name} 
                onChange={(e) => setItemEditData({ ...itemEditData, name: e.target.value })}
              />
              
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>보관 장소</InputLabel>
                  <Select
                    value={itemEditData.compartmentId}
                    label="보관 장소"
                    onChange={(e) => setItemEditData({ ...itemEditData, compartmentId: e.target.value, subCompartmentId: '' })}
                  >
                    {compartments.map((comp) => (
                      <MenuItem key={comp.id} value={comp.id}>{comp.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {filteredSubComps.length > 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>세부 칸</InputLabel>
                    <Select
                      value={itemEditData.subCompartmentId}
                      label="세부 칸"
                      onChange={(e) => setItemEditData({ ...itemEditData, subCompartmentId: e.target.value })}
                    >
                      <MenuItem value="">미지정</MenuItem>
                      {filteredSubComps.map((sc) => (
                        <MenuItem key={sc.id} value={sc.id}>{sc.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>

              <Box sx={{ px: 1, py: 0.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>보관 기간</Typography>
                <Typography variant="body2" sx={{ fontWeight: 900, color: daysPassed > 14 ? 'error.main' : 'primary.main' }}>
                  등록 후 <Box component="span" sx={{ fontSize: '1.1rem' }}>{daysPassed}</Box>일 경과
                </Typography>
              </Box>

              <TextField 
                label="등록일자" 
                type="date"
                fullWidth 
                size="small" 
                slotProps={{ inputLabel: { shrink: true } }}
                value={itemEditData.addedAt} 
                onChange={(e) => setItemEditData({ ...itemEditData, addedAt: e.target.value })}
              />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 900, mb: 0.5, display: 'block', color: '#FFD93D' }}>노란색 경고 (등록 후 며칠 뒤)</Typography>
                <TextField 
                  fullWidth 
                  type="number" 
                  size="small" 
                  value={itemEditData.warning} 
                  onChange={(e) => setItemEditData({ ...itemEditData, warning: Number(e.target.value) })}
                  placeholder="예: 7"
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 900, mb: 0.5, display: 'block', color: '#FF6B6B' }}>빨간색 위험 (등록 후 며칠 뒤)</Typography>
                <TextField 
                  fullWidth 
                  type="number" 
                  size="small" 
                  value={itemEditData.danger} 
                  onChange={(e) => setItemEditData({ ...itemEditData, danger: Number(e.target.value) })}
                  placeholder="예: 14"
                />
              </Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontStyle: 'italic' }}>
                * 기간을 0으로 설정하면 냉장고의 기본 설정을 따릅니다.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setThresholdEditItem(null)}>취소</Button>
            <Button variant="contained" onClick={handleSaveItemThreshold} sx={{ borderRadius: 2, fontWeight: 900 }}>저장하기</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DndContext>
  );
};

export default Dashboard;
