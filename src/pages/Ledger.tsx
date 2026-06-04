import { useState, useMemo, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, Stack, IconButton, 
  Button, Fab, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, useTheme, Chip, Autocomplete,
  ToggleButton, ToggleButtonGroup, Tooltip
} from '@mui/material';
import { 
  Plus, Trash2, Edit3, Settings2,
  ChevronLeft, ChevronRight, LogOut, Eye, EyeOff
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell as BarCell, Legend,
  LabelList
} from 'recharts';
import { useLedgerStore } from '../store/useLedgerStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import type { Expense } from '../types';

const CATEGORY_COLORS = ['#4A90E2', '#2ECC71', '#F1C40F', '#FF6B6B', '#9B59B6', '#FF9F43', '#1ABC9C', '#34495E'];

const Ledger = () => {
  const theme = useTheme();
  const { 
    expenses, categories, addExpense, removeExpense, updateExpense, 
    updateCategory, addCategory, removeCategory, syncCategoriesFromExpenses 
  } = useLedgerStore();
  const { signOut } = useAuthStore();
  
  // Auto-sync categories from expenses on mount or when expenses change
  useEffect(() => {
    if (expenses.length > 0 && categories.length === 0) {
      syncCategoriesFromExpenses();
    }
  }, [expenses.length, categories.length, syncCategoriesFromExpenses]);

  // View States
  const [activeDate, setActiveDate] = useState(new Date());
  const [trendViewMode, setTrendViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [listViewMode, setListViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
  const [isExcludeMode, setIsExcludeMode] = useState(false);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState({
    amount: '',
    category: '',
    comment: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [categoryBatch, setCategoryBatch] = useState({ old: '', new: '' });
  const [newCategoryName, setNewCategoryName] = useState('');

  const activeMonth = activeDate.getMonth();
  const activeYear = activeDate.getFullYear();

  // Categories from store
  const allCategories = categories;

  // Filtered Expenses
  const filteredForCat = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      const matchesDate = listViewMode === 'monthly' 
        ? (d.getMonth() === activeMonth && d.getFullYear() === activeYear)
        : (d.getFullYear() === activeYear);
      const matchesCategory = selectedCategoryFilter ? e.category === selectedCategoryFilter : true;
      const isNotExcluded = !excludedCategories.has(e.category);
      return matchesDate && matchesCategory && isNotExcluded;
    });
  }, [expenses, listViewMode, activeMonth, activeYear, selectedCategoryFilter, excludedCategories]);

  const listExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        const matchesDate = listViewMode === 'monthly' 
          ? (d.getMonth() === activeMonth && d.getFullYear() === activeYear)
          : (d.getFullYear() === activeYear);
        const matchesCategory = selectedCategoryFilter ? e.category === selectedCategoryFilter : true;
        return matchesDate && matchesCategory;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [expenses, activeMonth, activeYear, selectedCategoryFilter, listViewMode]);

  const totalDisplay = useMemo(() => {
    const currentList = expenses.filter(e => {
      const d = new Date(e.date);
      const matchesDate = listViewMode === 'monthly' 
        ? (d.getMonth() === activeMonth && d.getFullYear() === activeYear)
        : (d.getFullYear() === activeYear);
      const matchesCategory = selectedCategoryFilter ? e.category === selectedCategoryFilter : true;
      const isNotExcluded = !excludedCategories.has(e.category);
      return matchesDate && matchesCategory && isNotExcluded;
    });
    return currentList.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses, activeMonth, activeYear, selectedCategoryFilter, listViewMode, excludedCategories]);

  // Chart Data
  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredForCat.forEach(e => {
      data[e.category] = (data[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredForCat]);

  const trendData = useMemo(() => {
    if (trendViewMode === 'daily') {
      const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
      const data = Array.from({ length: daysInMonth }, (_, i) => ({ name: `${i + 1}`, value: 0 }));
      expenses.forEach(e => {
        const d = new Date(e.date);
        if (d.getMonth() === activeMonth && d.getFullYear() === activeYear) {
          const day = d.getDate();
          if (day <= daysInMonth && (!selectedCategoryFilter || e.category === selectedCategoryFilter) && !excludedCategories.has(e.category)) {
            data[day - 1].value += Number(e.amount);
          }
        }
      });
      return data;
    } else if (trendViewMode === 'monthly') {
      const data = Array.from({ length: 12 }, (_, i) => ({ name: `${i + 1}월`, value: 0 }));
      expenses.forEach(e => {
        const d = new Date(e.date);
        if (d.getFullYear() === activeYear && (!selectedCategoryFilter || e.category === selectedCategoryFilter) && !excludedCategories.has(e.category)) {
          const month = d.getMonth();
          data[month].value += Number(e.amount);
        }
      });
      return data;
    } else {
      const years = Array.from(new Set(expenses.map(e => new Date(e.date).getFullYear()))).sort();
      if (years.length === 0) return [];
      const minYear = years[0];
      const maxYear = years[years.length - 1];
      const data: { name: string; value: number }[] = [];
      for (let y = minYear; y <= maxYear; y++) {
        data.push({ name: `${y}`, value: 0 });
      }
      expenses.forEach(e => {
        const year = new Date(e.date).getFullYear();
        const idx = year - minYear;
        if (data[idx] && (!selectedCategoryFilter || e.category === selectedCategoryFilter) && !excludedCategories.has(e.category)) {
          data[idx].value += Number(e.amount);
        }
      });
      return data;
    }
  }, [expenses, trendViewMode, activeMonth, activeYear, selectedCategoryFilter, excludedCategories]);

  // Actions
  const handleAdd = () => {
    const rawAmount = editingExpense.amount.replace(/,/g, '');
    if (!rawAmount || !editingExpense.category) return;
    addExpense({
      amount: Number(rawAmount),
      category: editingExpense.category,
      comment: editingExpense.comment,
      date: editingExpense.date
    });
    setIsAddOpen(false);
    resetForm();
  };

  const handleEdit = () => {
    const rawAmount = editingExpense.amount.replace(/,/g, '');
    if (!selectedExpense || !rawAmount || !editingExpense.category) return;
    updateExpense(selectedExpense.id, {
      amount: Number(rawAmount),
      category: editingExpense.category,
      comment: editingExpense.comment,
      date: editingExpense.date
    });
    setIsEditOpen(false);
    resetForm();
  };

  const handleBatchUpdateCategory = () => {
    if (!categoryBatch.old || !categoryBatch.new) return;
    updateCategory(categoryBatch.old, categoryBatch.new);
    setCategoryBatch({ old: '', new: '' });
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(`'${cat}' 카테고리를 삭제하시겠습니까? 관련 지출 내역은 삭제되지 않지만 카테고리 목록에서 사라집니다.`)) {
      removeCategory(cat);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    addCategory(newCategoryName);
    setNewCategoryName('');
  };

  const resetForm = () => {
    setEditingExpense({
      amount: '',
      category: '',
      comment: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedExpense(null);
  };

  const openEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditingExpense({
      amount: expense.amount.toLocaleString(),
      category: expense.category,
      comment: expense.comment,
      date: expense.date
    });
    setIsEditOpen(true);
  };

  const handleAmountChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (raw === '') {
      setEditingExpense({ ...editingExpense, amount: '' });
      return;
    }
    const formatted = Number(raw).toLocaleString();
    setEditingExpense({ ...editingExpense, amount: formatted });
  };

  const changeDate = (delta: number) => {
    const next = new Date(activeDate);
    if (listViewMode === 'monthly') {
      next.setMonth(next.getMonth() + delta);
    } else {
      next.setFullYear(next.getFullYear() + delta);
    }
    setActiveDate(next);
  };

  const toggleExcludeCategory = (cat: string) => {
    const next = new Set(excludedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExcludedCategories(next);
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.dark', letterSpacing: -0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              우리집 가계부
            </Typography>
            <Chip 
              label={useAuthStore.getState().profile?.householdId ? "클라우드" : "연결중..."} 
              size="small" 
              color={useAuthStore.getState().profile?.householdId ? "success" : "warning"} 
              variant="outlined"
              sx={{ height: 16, fontSize: '0.55rem', fontWeight: 900 }}
            />
          </Box>
          <IconButton size="small" color="error" onClick={() => signOut()} sx={{ bgcolor: 'error.50' }}>
            <LogOut size={16} />
          </IconButton>
        </Box>
        
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }} component="div">
          <Stack direction="row" sx={{ alignItems: 'center' }} component="div">
            <Stack direction="row" sx={{ alignItems: 'center', bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2, p: 0.4 }} component="div">
              <IconButton size="small" onClick={() => changeDate(-1)} sx={{ p: 0.5 }}><ChevronLeft size={14} /></IconButton>
              <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 60, textAlign: 'center' }}>
                {listViewMode === 'monthly' ? `${activeYear}.${activeMonth + 1}` : `${activeYear}년`}
              </Typography>
              <IconButton size="small" onClick={() => changeDate(1)} sx={{ p: 0.5 }}><ChevronRight size={14} /></IconButton>
            </Stack>
            <ToggleButtonGroup
              value={listViewMode}
              exclusive
              onChange={(_, v) => v && setListViewMode(v)}
              size="small"
              sx={{ height: 32, ml: 1, '& .MuiToggleButton-root': { px: 1.5, py: 0, fontSize: '0.75rem', fontWeight: 800, border: 'none', bgcolor: 'rgba(0,0,0,0.03)', '&.Mui-selected': { bgcolor: 'primary.main', color: 'white' } } }}
            >
              <ToggleButton value="monthly">월</ToggleButton>
              <ToggleButton value="yearly">연</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <IconButton 
              size="small" 
              onClick={() => setIsShareOpen(true)} 
              sx={{ width: 32, height: 32, opacity: 0.5, '&:hover': { opacity: 1, bgcolor: 'rgba(0,0,0,0.03)' }, p: 0.5 }}
            >
              <Share2 size={16} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => setIsCategoryOpen(true)} 
              sx={{ width: 32, height: 32, opacity: 0.5, '&:hover': { opacity: 1, bgcolor: 'rgba(0,0,0,0.03)' }, p: 0.5 }}
            >
              <Settings2 size={16} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Horizontal Scrollable Charts for Mobile */}
      <Box sx={{ 
        mx: -2, px: 2, mb: 3, 
        overflowX: 'auto', 
        display: 'flex', 
        gap: 2,
        scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none'
      }}>
        {/* Category Distribution Chart */}
        <Card sx={{ 
          minWidth: { xs: 'calc(100vw - 32px)', md: 'calc(45% - 8px)' }, 
          scrollSnapAlign: 'start',
          borderRadius: 3, 
          border: '1px solid rgba(0,0,0,0.05)', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)' 
        }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }} component="div">
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                {listViewMode === 'monthly' ? '이달의 지출 분포' : '올해의 지출 분포'}
              </Typography>
            </Stack>
            <Box sx={{ height: 220, width: '100%', position: 'relative' }}>
              {categoryData.length > 0 ? (
                <>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: '41%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    textAlign: 'center',
                    pointerEvents: 'none',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6, fontSize: '0.6rem', lineHeight: 1 }}>
                      {excludedCategories.size > 0 ? '선택 합계' : '총 지출'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.85rem', mt: 0.2 }}>
                      {totalDisplay.toLocaleString()}
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', fontSize: '0.7rem' }}
                        formatter={(value: any, name: any) => [`${Number(value || 0).toLocaleString()}원`, String(name)]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '0.6rem', fontWeight: 800, paddingTop: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" color="text.secondary">내역 없음</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card sx={{ 
          minWidth: { xs: 'calc(100vw - 32px)', md: 'calc(55% - 8px)' }, 
          scrollSnapAlign: 'start',
          borderRadius: 3, 
          border: '1px solid rgba(0,0,0,0.05)', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)' 
        }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }} component="div">
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>지출 추이</Typography>
              <ToggleButtonGroup
                value={trendViewMode}
                exclusive
                onChange={(_, v) => v && setTrendViewMode(v)}
                size="small"
                sx={{ height: 20, '& .MuiToggleButton-root': { px: 0.8, py: 0, fontSize: '0.6rem', fontWeight: 800 } }}
              >
                <ToggleButton value="daily">일</ToggleButton>
                <ToggleButton value="monthly">월</ToggleButton>
                <ToggleButton value="yearly">연</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Box sx={{ 
              height: 220, 
              width: '100%', 
              display: 'flex'
            }}>
              {/* Fixed Y-Axis */}
              <Box sx={{ width: 30, height: '100%', pt: '10px', pb: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 2, bgcolor: 'background.paper' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 20, right: 0, left: -25, bottom: 5 }}>
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 8, fontWeight: 600, opacity: 0.5 }}
                      tickFormatter={(value) => Number(value) >= 10000 ? `${(Number(value) / 10000).toFixed(0)}만` : Number(value).toLocaleString()}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Scrollable Chart Content */}
              <Box sx={{ 
                flex: 1,
                overflowX: trendViewMode === 'daily' ? 'auto' : 'hidden',
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2 }
              }}>
                <Box sx={{ 
                  width: trendViewMode === 'daily' ? Math.max(100, (trendData.length / 20) * 100) + '%' : '100%',
                  height: '100%'
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis hide />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', fontSize: '0.7rem' }}
                        formatter={(value: any) => [`${Number(value || 0).toLocaleString()}원`, "지출"]}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={12}>
                        {trendData.map((entry, index) => (
                          <BarCell key={`cell-${index}`} fill={entry.value > 0 ? theme.palette.primary.main : 'rgba(0,0,0,0.05)'} />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="top" 
                          formatter={(v: any) => {
                            const val = Number(v || 0);
                            if (val <= 0) return '';
                            return val >= 10000 ? `${(val/10000).toFixed(0)}만` : `${(val/1000).toFixed(0)}k`;
                          }}
                          style={{ fontSize: 7, fontWeight: 800, fill: theme.palette.primary.main, opacity: 0.8 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Category Filter Scroll */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ToggleButton
          value="check"
          selected={isExcludeMode}
          onChange={() => setIsExcludeMode(!isExcludeMode)}
          size="small"
          sx={{ 
            height: 24, px: 1, borderRadius: '12px', fontSize: '0.65rem', fontWeight: 900,
            border: '1px solid', borderColor: isExcludeMode ? 'error.main' : 'divider',
            color: isExcludeMode ? 'error.main' : 'text.secondary',
            '&.Mui-selected': { bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }
          }}
        >
          {isExcludeMode ? <EyeOff size={12} style={{ marginRight: 4 }} /> : <Eye size={12} style={{ marginRight: 4 }} />}
          계산 제외 모드
        </ToggleButton>
        <Box sx={{ overflowX: 'auto', display: 'flex', gap: 1, pb: 0.5, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', flex: 1 }}>
          <Chip 
            label="전체" 
            onClick={() => setSelectedCategoryFilter(null)}
            variant={selectedCategoryFilter === null ? 'filled' : 'outlined'}
            color={selectedCategoryFilter === null ? 'primary' : 'default'}
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.75rem' }}
          />
          {allCategories.map(cat => {
            const isExcluded = excludedCategories.has(cat);
            return (
              <Chip 
                key={cat}
                label={cat} 
                onClick={() => isExcludeMode ? toggleExcludeCategory(cat) : setSelectedCategoryFilter(cat === selectedCategoryFilter ? null : cat)}
                variant={(selectedCategoryFilter === cat || (isExcludeMode && isExcluded)) ? 'filled' : 'outlined'}
                color={isExcludeMode ? (isExcluded ? 'error' : 'default') : (selectedCategoryFilter === cat ? 'primary' : 'default')}
                size="small"
                icon={isExcludeMode ? (isExcluded ? <EyeOff size={12} /> : <Eye size={12} />) : undefined}
                sx={{ 
                  fontWeight: 800, fontSize: '0.75rem',
                  textDecoration: (!isExcludeMode && isExcluded) ? 'line-through' : 'none',
                  opacity: (!isExcludeMode && isExcluded) ? 0.5 : 1
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Transaction List */}
      <Box>
        <Stack sx={{ spacing: 1 }} component="div">
          <AnimatePresence mode="popLayout">
            {listExpenses.map((expense) => (
              <motion.div
                key={expense.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.02)', 
                  boxShadow: 'none',
                  bgcolor: 'background.paper',
                  opacity: excludedCategories.has(expense.category) ? 0.6 : 1,
                  '&:active': { transform: 'scale(0.99)', bgcolor: 'rgba(0,0,0,0.02)' }
                }}>
                  <CardContent sx={{ py: '8px !important', px: '12px !important' }}>
                    <Grid container sx={{ alignItems: 'center' }} spacing={1.5} component="div">
                      <Grid sx={{ flex: 1 }} component="div">
                        <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1} component="div">
                          <Typography variant="body2" sx={{ fontWeight: 900, textDecoration: excludedCategories.has(expense.category) ? 'line-through' : 'none' }}>
                            {expense.category}
                          </Typography>
                          {expense.comment && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 80 }}>
                              {expense.comment}
                            </Typography>
                          )}
                          {excludedCategories.has(expense.category) && (
                            <Tooltip title="합계에서 제외됨">
                              <EyeOff size={10} color={theme.palette.error.main} />
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>
                          {expense.date.split('-').slice(1).join('.')}
                        </Typography>
                      </Grid>
                      <Grid component="div">
                        <Typography variant="body1" sx={{ fontWeight: 900, color: excludedCategories.has(expense.category) ? 'text.disabled' : 'text.primary', textDecoration: excludedCategories.has(expense.category) ? 'line-through' : 'none' }}>
                          {expense.amount.toLocaleString()}원
                        </Typography>
                      </Grid>
                      <Grid component="div">
                        <Stack direction="row" spacing={0} component="div">
                          <IconButton size="small" onClick={() => openEdit(expense)} sx={{ p: 0.5, opacity: 0.3 }}><Edit3 size={12} /></IconButton>
                          <IconButton size="small" color="error" onClick={() => removeExpense(expense.id)} sx={{ p: 0.5, opacity: 0.3 }}><Trash2 size={12} /></IconButton>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          {listExpenses.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>내역이 없습니다.</Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Floating Action Button */}
      <Fab 
        color="primary" 
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 160, sm: 90 }, 
          right: 20, 
          boxShadow: '0 4px 16px rgba(74, 144, 226, 0.4)',
          width: 48, height: 48,
          zIndex: 1050
        }}
        onClick={() => { resetForm(); setIsAddOpen(true); }}
      >
        <Plus size={24} />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
          {isAddOpen ? '지출 추가' : '지출 수정'}
        </DialogTitle>
        <DialogContent>
          <Stack sx={{ spacing: 2.5, mt: 1 }} component="div">
            <TextField
              label="금액"
              fullWidth
              size="small"
              value={editingExpense.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              slotProps={{ input: { startAdornment: <Typography sx={{ mr: 1, fontWeight: 700, fontSize: '0.9rem' }}>₩</Typography> } }}
            />
            <Autocomplete
              freeSolo
              options={allCategories}
              size="small"
              value={editingExpense.category}
              onChange={(_, newValue) => setEditingExpense({ ...editingExpense, category: newValue || '' })}
              onInputChange={(_, newValue) => setEditingExpense({ ...editingExpense, category: newValue })}
              renderInput={(params) => <TextField {...params} label="카테고리" />}
            />
            <TextField
              label="날짜"
              type="date"
              fullWidth
              size="small"
              value={editingExpense.date}
              onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="메모"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={editingExpense.comment}
              onChange={(e) => setEditingExpense({ ...editingExpense, comment: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} sx={{ fontWeight: 700 }}>취소</Button>
          <Button 
            variant="contained" 
            onClick={isAddOpen ? handleAdd : handleEdit} 
            sx={{ fontWeight: 800, borderRadius: 2, px: 3, boxShadow: 'none' }}
            disabled={!editingExpense.amount || !editingExpense.category}
          >
            {isAddOpen ? '추가' : '수정'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryOpen} onClose={() => setIsCategoryOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }} component="div">
            카테고리 관리
            <Button 
              size="small" 
              startIcon={<Settings2 size={14} />} 
              onClick={() => syncCategoriesFromExpenses()}
              sx={{ fontSize: '0.7rem', fontWeight: 800 }}
            >
              지출에서 가져오기
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Add New Category */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', mb: 1, display: 'block' }}>
                새 카테고리 추가
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="예: 간식비"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button variant="contained" onClick={handleAddCategory} sx={{ minWidth: 55, px: 1, borderRadius: 2, boxShadow: 'none', fontWeight: 800 }}>
                  추가
                </Button>
              </Stack>
            </Box>

            {/* List and Edit Categories */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', mb: 1, display: 'block' }}>
                카테고리 목록 및 편집
              </Typography>
              <Box sx={{ 
                maxHeight: 300, 
                overflowY: 'auto', 
                border: '1px solid rgba(0,0,0,0.05)', 
                borderRadius: 2,
                bgcolor: 'rgba(0,0,0,0.01)'
              }}>
                <Stack>
                  {allCategories.map((cat) => (
                    <Box key={cat} sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      p: 1.5,
                      borderBottom: '1px solid rgba(0,0,0,0.03)',
                      '&:last-child': { borderBottom: 'none' }
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{cat}</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => setCategoryBatch({ old: cat, new: cat })} sx={{ p: 0.5 }}>
                          <Edit3 size={14} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat)} sx={{ p: 0.5 }}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                  {allCategories.length === 0 && (
                    <Box sx={{ p: 3, textAlign: 'center', opacity: 0.5 }}>
                      <Typography variant="caption">등록된 카테고리가 없습니다.</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Inline Rename Box */}
            <AnimatePresence>
              {categoryBatch.old && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.100' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block' }}>
                      '{categoryBatch.old}' 수정 (통합하려면 기존 이름 선택)
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Autocomplete
                        fullWidth
                        freeSolo
                        size="small"
                        options={allCategories.filter(c => c !== categoryBatch.old)}
                        value={categoryBatch.new}
                        onChange={(_, newValue) => setCategoryBatch({ ...categoryBatch, new: newValue || '' })}
                        onInputChange={(_, newValue) => setCategoryBatch({ ...categoryBatch, new: newValue })}
                        renderInput={(params) => <TextField {...params} sx={{ bgcolor: 'white' }} />}
                      />
                      <Button variant="contained" onClick={handleBatchUpdateCategory} sx={{ minWidth: 48, px: 1, borderRadius: 2, boxShadow: 'none', fontWeight: 800, fontSize: '0.75rem' }}>
                        {allCategories.includes(categoryBatch.new) && categoryBatch.new !== categoryBatch.old ? '통합' : '변경'}
                      </Button>
                      <Button onClick={() => setCategoryBatch({ old: '', new: '' })} sx={{ minWidth: 48, px: 1, fontWeight: 800, fontSize: '0.75rem' }}>
                        취소
                      </Button>
                    </Stack>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setIsCategoryOpen(false); setCategoryBatch({ old: '', new: '' }); }} sx={{ fontWeight: 700 }}>닫기</Button>
        </DialogActions>
      </Dialog>

      <ShareDialog open={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </Box>
  );
};

export default Ledger;
