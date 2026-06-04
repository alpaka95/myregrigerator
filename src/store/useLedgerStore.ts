import { create } from 'zustand';
import { 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from './useAuthStore';
import type { 
  LedgerState,
  Expense
} from '../types/index';

const getHouseholdId = () => useAuthStore.getState().profile?.householdId;

export const useLedgerStore = create<LedgerState>((set) => ({
  expenses: [],
  categories: [],

  setExpenses: (expenses) => set({ expenses }),
  setCategories: (categories) => set({ categories }),

  syncCategoriesFromExpenses: async () => {
    const { expenses, categories } = useLedgerStore.getState();
    const householdId = getHouseholdId();
    if (!householdId || expenses.length === 0) return;

    const uniqueExpCats = Array.from(new Set(expenses.map(e => e.category))).filter(Boolean);
    const missingCats = uniqueExpCats.filter(cat => !categories.includes(cat));

    if (missingCats.length > 0) {
      try {
        const batch = writeBatch(db);
        missingCats.forEach(cat => {
          batch.set(doc(db, `households/${householdId}/categories`, cat), { name: cat });
        });
        await batch.commit();
        console.log(`Synced ${missingCats.length} categories from expenses.`);
      } catch (err) {
        console.error("Failed to sync categories:", err);
      }
    }
  },

  addExpense: async (newExpense) => {
    const householdId = getHouseholdId();
    const id = Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString();
    
    const expense = { ...newExpense, id, createdAt };

    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/expenses`, id), expense);
        // Also ensure category exists in master list
        const categories = useLedgerStore.getState().categories;
        if (!categories.includes(newExpense.category)) {
          await setDoc(doc(db, `households/${householdId}/categories`, newExpense.category), { name: newExpense.category });
        }
      } catch (err: unknown) {
        console.error("Firestore error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`지출 내역 추가 실패: ${errorMessage}`);
      }
    } else {
      set((state) => ({ 
        expenses: [...state.expenses, expense as Expense],
        categories: state.categories.includes(newExpense.category) ? state.categories : [...state.categories, newExpense.category]
      }));
    }
  },

  removeExpense: async (id) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await deleteDoc(doc(db, `households/${householdId}/expenses`, id));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`지출 내역 삭제 실패: ${errorMessage}`);
      }
    } else {
      set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    }
  },

  updateExpense: async (id, updates) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await updateDoc(doc(db, `households/${householdId}/expenses`, id), updates);
        if (updates.category) {
          const categories = useLedgerStore.getState().categories;
          if (!categories.includes(updates.category)) {
            await setDoc(doc(db, `households/${householdId}/categories`, updates.category), { name: updates.category });
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`지출 내역 수정 실패: ${errorMessage}`);
      }
    } else {
      set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        categories: (updates.category && !state.categories.includes(updates.category)) ? [...state.categories, updates.category] : state.categories
      }));
    }
  },

  updateCategory: async (oldCategory, newCategory) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        const batch = writeBatch(db);
        
        // Update all expenses with this category
        const q = query(collection(db, `households/${householdId}/expenses`), where("category", "==", oldCategory));
        const snapshot = await getDocs(q);
        snapshot.forEach((d) => {
          batch.update(d.ref, { category: newCategory });
        });
        
        // Update the category document itself
        batch.delete(doc(db, `households/${householdId}/categories`, oldCategory));
        batch.set(doc(db, `households/${householdId}/categories`, newCategory), { name: newCategory });
        
        await batch.commit();

        // Local state update for immediate feedback
        set((state) => {
          const updatedCategories = state.categories
            .filter(c => c !== oldCategory);
          if (!updatedCategories.includes(newCategory)) {
            updatedCategories.push(newCategory);
          }
          return {
            expenses: state.expenses.map((e) => (e.category === oldCategory ? { ...e, category: newCategory } : e)),
            categories: updatedCategories
          };
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`카테고리 수정 실패: ${errorMessage}`);
      }
    } else {
      set((state) => {
        const updatedCategories = state.categories
          .filter(c => c !== oldCategory);
        if (!updatedCategories.includes(newCategory)) {
          updatedCategories.push(newCategory);
        }
        return {
          expenses: state.expenses.map((e) => (e.category === oldCategory ? { ...e, category: newCategory } : e)),
          categories: updatedCategories
        };
      });
    }
  },

  addCategory: async (category) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/categories`, category), { name: category });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`카테고리 추가 실패: ${errorMessage}`);
      }
    } else {
      set((state) => ({
        categories: state.categories.includes(category) ? state.categories : [...state.categories, category]
      }));
    }
  },

  removeCategory: async (category) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await deleteDoc(doc(db, `households/${householdId}/categories`, category));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`카테고리 삭제 실패: ${errorMessage}`);
      }
    } else {
      set((state) => ({
        categories: state.categories.filter(c => c !== category)
      }));
    }
  },
}));
