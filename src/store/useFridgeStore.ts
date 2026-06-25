import { create } from 'zustand';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  updateDoc,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from './useAuthStore';
import type { 
  RefrigeratorState, 
  FoodItem, 
  Compartment, 
  SubCompartment, 
  ShoppingItem,
  Recipe,
  WeeklyMenu
} from '../types/index';

const getHouseholdId = () => useAuthStore.getState().profile?.householdId;

// Helper to remove undefined values before saving to Firestore
// Also handle empty strings as deleteField() for subCompartmentId and other optional ID fields
const cleanData = (data: any) => {
  const clean: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] === undefined) return;
    
    // Explicitly delete subCompartmentId if it's an empty string or null
    if (key === 'subCompartmentId' && (data[key] === '' || data[key] === null)) {
      clean[key] = deleteField();
    } else {
      clean[key] = data[key];
    }
  });
  return clean;
};

export const useFridgeStore = create<RefrigeratorState & {
  setItems: (items: FoodItem[]) => void;
  setCompartments: (compartments: Compartment[]) => void;
  setSubCompartments: (subCompartments: SubCompartment[]) => void;
  setShoppingList: (shoppingList: ShoppingItem[]) => void;
  setRecipes: (recipes: Recipe[]) => void;
  clearStorage: () => Promise<void>;
}>((set, get) => ({
  items: [],
  compartments: [],
  subCompartments: [],
  shoppingList: [],
  recipes: [],
  weeklyMenu: [],
  lastDeletedItem: null,

  setItems: (items) => set({ items }),
  setCompartments: (compartments) => set({ compartments }),
  setSubCompartments: (subCompartments) => set({ subCompartments }),
  setShoppingList: (shoppingList) => set({ shoppingList }),
  setRecipes: (recipes) => set({ recipes }),
  setWeeklyMenu: (weeklyMenu) => set({ weeklyMenu }),

  updateWeeklyMenu: async (id, menu, recipeLink) => {
    const householdId = getHouseholdId();
    const userId = useAuthStore.getState().user?.uid;
    const isHolding = id.startsWith('holding_');
    const day = isHolding ? 'holding' : id.split('_')[0];
    const type = isHolding ? 'holding' : id.split('_')[1] as 'breakfast' | 'lunch' | 'dinner';
    
    if (!menu.trim()) {
      set(state => ({
        weeklyMenu: state.weeklyMenu.filter(m => m.id !== id)
      }));
      if (householdId) {
        try {
          await deleteDoc(doc(db, `households/${householdId}/weeklyMenu`, id));
        } catch (err) {
          console.error("Delete meal failed:", err);
        }
      }
      return;
    }

    const newItem: WeeklyMenu = {
      id,
      day,
      type: type as any,
      menu,
      recipeLink: recipeLink || '',
      isCompleted: false,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      lastReadBy: userId ? [userId] : []
    };

    set(state => {
      const existing = state.weeklyMenu.filter(m => m.id !== id);
      return { weeklyMenu: [...existing, newItem] };
    });

    if (householdId) {
      try {
        const itemRef = doc(db, `households/${householdId}/weeklyMenu`, id);
        await setDoc(itemRef, { 
          ...newItem,
          updatedAt: new Date().toISOString() 
        }, { merge: true });
      } catch (err) {
        console.error("Update weekly menu failed:", err);
      }
    }
  },

  markWeeklyMenuAsRead: async (id: string) => {
    const householdId = getHouseholdId();
    const userId = useAuthStore.getState().user?.uid;
    if (!householdId || !userId) return;

    const item = get().weeklyMenu.find(m => m.id === id);
    if (!item || item.lastReadBy?.includes(userId)) return;

    const newReadBy = [...(item.lastReadBy || []), userId];
    
    set(state => ({
      weeklyMenu: state.weeklyMenu.map(m => m.id === id ? { ...m, lastReadBy: newReadBy } : m)
    }));

    try {
      const itemRef = doc(db, `households/${householdId}/weeklyMenu`, id);
      await updateDoc(itemRef, { lastReadBy: newReadBy });
    } catch (err) {
      console.error("Mark as read failed:", err);
    }
  },

  swapWeeklyMenu: async (sourceId, targetId) => {
    const householdId = getHouseholdId();
    const userId = useAuthStore.getState().user?.uid;
    if (!householdId) return;

    const source = get().weeklyMenu.find(m => m.id === sourceId);
    const target = get().weeklyMenu.find(m => m.id === targetId);

    if (!source?.menu && !target?.menu) return;

    // Logic for moving between Holding Area and Weekly Slots
    // If target is 'holding_area_new', generate a unique ID
    let finalTargetId = targetId;
    if (targetId === 'holding_area_dropzone') {
       finalTargetId = `holding_${Math.random().toString(36).substring(2, 9)}`;
    }

    const sourceData = { 
      menu: target?.menu || '', 
      recipeLink: target?.recipeLink || '',
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      lastReadBy: userId ? [userId] : []
    };
    
    const targetData = { 
      menu: source?.menu || '', 
      recipeLink: source?.recipeLink || '',
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      lastReadBy: userId ? [userId] : []
    };

    set(state => {
      const otherMeals = state.weeklyMenu.filter(m => m.id !== sourceId && m.id !== finalTargetId);
      const newMenu = [...otherMeals];
      
      if (sourceData.menu && !sourceId.startsWith('holding_')) {
        newMenu.push({
          id: sourceId,
          day: sourceId.split('_')[0],
          type: sourceId.split('_')[1] as any,
          isCompleted: source?.isCompleted || false,
          ...sourceData
        });
      }
      
      if (targetData.menu) {
        const isHolding = finalTargetId.startsWith('holding_');
        newMenu.push({
          id: finalTargetId,
          day: isHolding ? 'holding' : finalTargetId.split('_')[0],
          type: isHolding ? 'holding' : finalTargetId.split('_')[1] as any,
          isCompleted: target?.isCompleted || false,
          ...targetData
        });
      }
      
      return { weeklyMenu: newMenu };
    });

    try {
      const batch = writeBatch(db);
      const sourceRef = doc(db, `households/${householdId}/weeklyMenu`, sourceId);
      const targetRef = doc(db, `households/${householdId}/weeklyMenu`, finalTargetId);
      
      if (!sourceData.menu) {
        batch.delete(sourceRef);
      } else {
        const isHolding = sourceId.startsWith('holding_');
        batch.set(sourceRef, { 
          ...sourceData, 
          id: sourceId, 
          day: isHolding ? 'holding' : sourceId.split('_')[0], 
          type: isHolding ? 'holding' : sourceId.split('_')[1] 
        }, { merge: true });
      }
      
      if (!targetData.menu) {
        batch.delete(targetRef);
      } else {
        const isHolding = finalTargetId.startsWith('holding_');
        batch.set(targetRef, { 
          ...targetData, 
          id: finalTargetId, 
          day: isHolding ? 'holding' : finalTargetId.split('_')[0], 
          type: isHolding ? 'holding' : finalTargetId.split('_')[1] 
        }, { merge: true });
      }
      
      await batch.commit();
    } catch (err) {
      console.error("Swap meal failed:", err);
    }
  },

  toggleWeeklyMenuComplete: async (id) => {
    const householdId = getHouseholdId();
    const item = get().weeklyMenu.find(m => m.id === id);
    if (!item) return;

    set(state => ({
      weeklyMenu: state.weeklyMenu.map(m => m.id === id ? { ...m, isCompleted: !m.isCompleted } : m)
    }));

    if (householdId) {
      try {
        const itemRef = doc(db, `households/${householdId}/weeklyMenu`, id);
        await updateDoc(itemRef, { isCompleted: !item.isCompleted });
      } catch (err) {
        console.error("Toggle weekly menu failed:", err);
      }
    }
  },

  clearWeeklySlots: async () => {
    const householdId = getHouseholdId();
    const itemsToDelete = get().weeklyMenu.filter(m => !m.id.startsWith('holding_'));
    set(state => ({
      weeklyMenu: state.weeklyMenu.filter(m => m.id.startsWith('holding_'))
    }));

    if (householdId) {
      try {
        const batch = writeBatch(db);
        itemsToDelete.forEach(item => {
          const itemRef = doc(db, `households/${householdId}/weeklyMenu`, item.id);
          batch.delete(itemRef);
        });
        await batch.commit();
      } catch (err) {
        console.error("Clear weekly slots failed:", err);
      }
    }
  },

  clearArchive: async () => {
    const householdId = getHouseholdId();
    const itemsToDelete = get().weeklyMenu.filter(m => m.id.startsWith('holding_'));
    set(state => ({
      weeklyMenu: state.weeklyMenu.filter(m => !m.id.startsWith('holding_'))
    }));

    if (householdId) {
      try {
        const batch = writeBatch(db);
        itemsToDelete.forEach(item => {
          const itemRef = doc(db, `households/${householdId}/weeklyMenu`, item.id);
          batch.delete(itemRef);
        });
        await batch.commit();
      } catch (err) {
        console.error("Clear archive failed:", err);
      }
    }
  },

  addItem: async (newItem) => {
    const householdId = getHouseholdId();
    const id = Math.random().toString(36).substring(2, 9);
    const addedAt = (newItem as any).addedAt || new Date().toISOString();
    
    const currentItems = get().items;
    const maxSortOrder = currentItems.length > 0 
      ? Math.max(...currentItems.map(i => i.sortOrder || 0)) 
      : 0;
    const sortOrder = maxSortOrder + 1;

    const item = cleanData({ ...newItem, id, addedAt, sortOrder });

    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/items`, id), item);
      } catch (err: any) {
        console.error("Firestore error:", err);
        alert(`품목 추가 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ items: [...state.items, item as FoodItem] }));
    }
  },

  removeItem: async (id) => {
    const householdId = getHouseholdId();
    const itemToDelete = get().items.find(i => i.id === id);
    if (!itemToDelete) return;

    set({ lastDeletedItem: itemToDelete });

    if (householdId) {
      try {
        await deleteDoc(doc(db, `households/${householdId}/items`, id));
      } catch (err: any) {
        alert(`품목 삭제 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }
  },

  undoDelete: async () => {
    const { lastDeletedItem } = get();
    if (!lastDeletedItem) return;

    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/items`, lastDeletedItem.id), lastDeletedItem);
        set({ lastDeletedItem: null });
      } catch (err: any) {
        alert(`복구 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ items: [...state.items, lastDeletedItem], lastDeletedItem: null }));
    }
  },

  updateItem: async (id, updates) => {
    const householdId = getHouseholdId();
    const cleanUpdates = cleanData(updates);

    // Update local state first for immediate feedback
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));

    if (householdId) {
      try {
        await updateDoc(doc(db, `households/${householdId}/items`, id), cleanUpdates);
      } catch (err: any) {
        console.error("Update failed:", err);
      }
    }
  },

  reorderItems: async (compartmentId, newOrderIds) => {
    const householdId = getHouseholdId();
    const updatedItems = get().items.map(item => {
      if (item.compartmentId === compartmentId) {
        const index = newOrderIds.indexOf(item.id);
        return index !== -1 ? { ...item, sortOrder: index } : item;
      }
      return item;
    });

    set({ items: updatedItems });

    if (householdId) {
      try {
        const batch = writeBatch(db);
        updatedItems.forEach(item => {
          if (item.compartmentId === compartmentId) {
            batch.update(doc(db, `households/${householdId}/items`, item.id), { sortOrder: item.sortOrder });
          }
        });
        await batch.commit();
      } catch (err: any) {
        console.error("Reorder failed:", err);
      }
    }
  },

  addCompartment: async (comp) => {
    const householdId = getHouseholdId();
    const id = Math.random().toString(36).substring(2, 9);
    const order = get().compartments.length;
    const newComp = { ...comp, id, order };

    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/compartments`, id), newComp);
      } catch (err: any) {
        alert(`구획 추가 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ compartments: [...state.compartments, newComp] }));
    }
  },

  removeCompartment: async (id) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await deleteDoc(doc(db, `households/${householdId}/compartments`, id));
      } catch (err: any) {
        alert(`구획 삭제 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ compartments: state.compartments.filter((c) => c.id !== id) }));
    }
  },

  updateCompartment: async (id, updates) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await updateDoc(doc(db, `households/${householdId}/compartments`, id), updates);
      } catch (err: any) {
        alert(`구획 수정 실패: ${err.message}`);
      }
    } else {
      set((state) => ({
        compartments: state.compartments.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
    }
  },

  reorderCompartments: async (newOrderIds) => {
    const householdId = getHouseholdId();
    const updatedCompartments = get().compartments.map(comp => {
      const index = newOrderIds.indexOf(comp.id);
      return index !== -1 ? { ...comp, order: index } : comp;
    });

    set({ compartments: updatedCompartments });

    if (householdId) {
      try {
        const batch = writeBatch(db);
        updatedCompartments.forEach(comp => {
          batch.update(doc(db, `households/${householdId}/compartments`, comp.id), { order: comp.order });
        });
        await batch.commit();
      } catch (err: any) {
        console.error("Reorder compartments failed:", err);
      }
    }
  },

  addSubCompartment: async (parentId, name) => {
    const householdId = getHouseholdId();
    const id = Math.random().toString(36).substring(2, 9);
    const newSub = { id, parentId, name };

    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/subCompartments`, id), newSub);
      } catch (err: any) {
        alert(`상세 구획 추가 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ subCompartments: [...state.subCompartments, newSub] }));
    }
  },

  removeSubCompartment: async (id) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await deleteDoc(doc(db, `households/${householdId}/subCompartments`, id));
      } catch (err: any) {
        alert(`상세 구획 삭제 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ subCompartments: state.subCompartments.filter((s) => s.id !== id) }));
    }
  },

  updateSubCompartment: async (id, name) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await updateDoc(doc(db, `households/${householdId}/subCompartments`, id), { name });
      } catch (err: any) {
        alert(`상세 구획 수정 실패: ${err.message}`);
      }
    } else {
      set((state) => ({
        subCompartments: state.subCompartments.map((s) => (s.id === id ? { ...s, name } : s)),
      }));
    }
  },

  addShoppingItem: async (name) => {
    const householdId = getHouseholdId();
    const id = Math.random().toString(36).substring(2, 9);
    const newItem = { id, name, completed: false, sortOrder: get().shoppingList.length };

    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/shoppingList`, id), newItem);
      } catch (err: any) {
        alert(`장보기 품목 추가 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ shoppingList: [...state.shoppingList, newItem] }));
    }
  },

  toggleShoppingItem: async (id) => {
    const householdId = getHouseholdId();
    const item = get().shoppingList.find(i => i.id === id);
    if (!item) return;

    if (householdId) {
      try {
        await updateDoc(doc(db, `households/${householdId}/shoppingList`, id), { completed: !item.completed });
      } catch (err: any) {
        alert(`장보기 품목 상태 변경 실패: ${err.message}`);
      }
    } else {
      set((state) => ({
        shoppingList: state.shoppingList.map((item) =>
          item.id === id ? { ...item, completed: !item.completed } : item
        ),
      }));
    }
  },

  removeShoppingItem: async (id) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await deleteDoc(doc(db, `households/${householdId}/shoppingList`, id));
      } catch (err: any) {
        alert(`장보기 품목 삭제 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ shoppingList: state.shoppingList.filter((item) => item.id !== id) }));
    }
  },

  clearCompletedShopping: async () => {
    const householdId = getHouseholdId();
    const completedItems = get().shoppingList.filter(item => item.completed);
    
    if (householdId) {
      try {
        const batch = writeBatch(db);
        completedItems.forEach(item => {
          batch.delete(doc(db, `households/${householdId}/shoppingList`, item.id));
        });
        await batch.commit();
      } catch (err: any) {
        alert(`완료된 품목 삭제 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ shoppingList: state.shoppingList.filter((item) => !item.completed) }));
    }
  },

  reorderShoppingList: async (newOrderIds) => {
    const householdId = getHouseholdId();
    const updatedList = get().shoppingList.map(item => {
      const index = newOrderIds.indexOf(item.id);
      return index !== -1 ? { ...item, sortOrder: index } : item;
    });

    set({ shoppingList: updatedList });

    if (householdId) {
      try {
        const batch = writeBatch(db);
        updatedList.forEach(item => {
          batch.update(doc(db, `households/${householdId}/shoppingList`, item.id), { sortOrder: item.sortOrder });
        });
        await batch.commit();
      } catch (err: any) {
        console.error("Reorder failed:", err);
      }
    }
  },

  addRecipe: async (recipe) => {
    const householdId = getHouseholdId();
    const id = Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString();
    const sortOrder = get().recipes.length;
    const recipeData = cleanData({ ...recipe, id, createdAt, sortOrder });

    if (householdId) {
      try {
        await setDoc(doc(db, `households/${householdId}/recipes`, id), recipeData);
      } catch (err: any) {
        alert(`레시피 추가 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ recipes: [...state.recipes, recipeData as Recipe] }));
    }
  },

  removeRecipe: async (id) => {
    const householdId = getHouseholdId();
    if (householdId) {
      try {
        await deleteDoc(doc(db, `households/${householdId}/recipes`, id));
      } catch (err: any) {
        alert(`레시피 삭제 실패: ${err.message}`);
      }
    } else {
      set((state) => ({ recipes: state.recipes.filter((r) => r.id !== id) }));
    }
  },

  updateRecipe: async (id, updates) => {
    const householdId = getHouseholdId();
    const cleanUpdates = cleanData(updates);

    if (householdId) {
      try {
        await updateDoc(doc(db, `households/${householdId}/recipes`, id), cleanUpdates);
      } catch (err: any) {
        alert(`레시피 수정 실패: ${err.message}`);
      }
    } else {
      set((state) => ({
        recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }));
    }
  },

  reorderRecipes: async (newOrderIds) => {
    const householdId = getHouseholdId();
    const updatedRecipes = get().recipes.map(recipe => {
      const index = newOrderIds.indexOf(recipe.id);
      return index !== -1 ? { ...recipe, sortOrder: index } : recipe;
    });

    set({ recipes: updatedRecipes });

    if (householdId) {
      try {
        const batch = writeBatch(db);
        updatedRecipes.forEach(item => {
          batch.update(doc(db, `households/${householdId}/recipes`, item.id), { sortOrder: item.sortOrder });
        });
        await batch.commit();
      } catch (err: any) {
        console.error("Reorder failed in Firestore:", err);
      }
    }
  },

  clearStorage: async () => {
    const householdId = getHouseholdId();
    set({ items: [] });

    if (householdId) {
      try {
        const batch = writeBatch(db);
        const currentItems = get().items;
        currentItems.forEach(item => {
          const itemRef = doc(db, `households/${householdId}/items`, item.id);
          batch.delete(itemRef);
        });
        await batch.commit();
      } catch (err: any) {
        console.error("Clear storage failed:", err);
      }
    }
  },
}));
