import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, FormControl, InputLabel, Select, MenuItem, Stack, Typography, IconButton
} from '@mui/material';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { useFridgeStore } from '../store/useFridgeStore';
import type { FoodItem } from '../types';

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  defaultCompartmentId?: string;
  initialItem?: FoodItem;
}

const AddItemDialog = ({ open, onClose, defaultCompartmentId, initialItem }: AddItemDialogProps) => {
  const { addItem, updateItem, compartments, subCompartments } = useFridgeStore();
  const nameRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: '개',
    category: '식재료',
    compartmentId: '',
    subCompartmentId: '',
    expiryDate: '',
    addedAt: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      if (initialItem) {
        setFormData({
          name: initialItem.name,
          quantity: initialItem.quantity,
          unit: initialItem.unit,
          category: initialItem.category,
          compartmentId: initialItem.compartmentId,
          subCompartmentId: initialItem.subCompartmentId || '',
          expiryDate: initialItem.expiryDate || '',
          addedAt: initialItem.addedAt ? initialItem.addedAt.split('T')[0] : new Date().toISOString().split('T')[0],
        });
      } else {
        setFormData({
          name: '',
          quantity: 1,
          unit: '개',
          category: '식재료',
          compartmentId: defaultCompartmentId || (compartments.length > 0 ? compartments[0].id : ''),
          subCompartmentId: '',
          expiryDate: '',
          addedAt: new Date().toISOString().split('T')[0],
        });
      }
      setTimeout(() => nameRef.current?.focus(), 10);
    }
  }, [open, defaultCompartmentId, compartments, initialItem]);

  const filteredSubComps = useMemo(() => {
    return subCompartments.filter(sc => sc.parentId === formData.compartmentId);
  }, [subCompartments, formData.compartmentId]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.name || !formData.compartmentId) return;
    
    const finalData = {
      ...formData,
      subCompartmentId: formData.subCompartmentId || undefined
    };

    if (initialItem) {
      updateItem(initialItem.id, finalData);
      onClose();
    } else {
      addItem(finalData as any);
      // Reset name and focus for next entry
      setFormData(prev => ({ ...prev, name: '' }));
      setTimeout(() => nameRef.current?.focus(), 10);
    }
  };

  const handleAddAndClose = () => {
    handleSubmit();
    if (!initialItem) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {initialItem ? '품목 수정' : '품목 추가'}
        <IconButton size="small" onClick={onClose} sx={{ opacity: 0.5 }}><X size={20} /></IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              inputRef={nameRef}
              label="품목 이름"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 사과, 우유, 김치"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="수량"
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              />
              <TextField
                label="단위"
                fullWidth
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </Stack>
            <TextField
              label="카테고리"
              fullWidth
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>보관 장소</InputLabel>
                <Select
                  value={formData.compartmentId}
                  label="보관 장소"
                  onChange={(e) => {
                    const newCompId = e.target.value;
                    setFormData({ ...formData, compartmentId: newCompId, subCompartmentId: '' });
                  }}
                >
                  {compartments.map((comp) => (
                    <MenuItem key={comp.id} value={comp.id}>{comp.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {filteredSubComps.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel>세부 칸</InputLabel>
                  <Select
                    value={formData.subCompartmentId}
                    label="세부 칸"
                    onChange={(e) => setFormData({ ...formData, subCompartmentId: e.target.value })}
                  >
                    <MenuItem value="">미지정</MenuItem>
                    {filteredSubComps.map((sc) => (
                      <MenuItem key={sc.id} value={sc.id}>{sc.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>

            <TextField
              label="유통기한"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            />
            <TextField
              label="등록일자"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={formData.addedAt}
              onChange={(e) => setFormData({ ...formData, addedAt: e.target.value })}
            />
            {!initialItem && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600 }}>
                엔터를 누르면 계속해서 추가할 수 있습니다.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>취소</Button>
          {initialItem ? (
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!formData.name || !formData.compartmentId}
              startIcon={<Save size={18} />}
              sx={{ fontWeight: 800 }}
            >
              저장하기
            </Button>
          ) : (
            <>
              <Button 
                variant="outlined" 
                onClick={handleAddAndClose}
                disabled={!formData.name || !formData.compartmentId}
                sx={{ fontWeight: 700 }}
              >
                추가 후 닫기
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={!formData.name || !formData.compartmentId}
                startIcon={<Plus size={18} />}
                sx={{ fontWeight: 800 }}
              >
                계속 추가
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddItemDialog;
