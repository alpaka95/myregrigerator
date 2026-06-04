import { useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useFridgeStore } from '../store/useFridgeStore';
import { useLedgerStore } from '../store/useLedgerStore';
import type { 
  UserProfile, 
  Household, 
  FoodItem, 
  Compartment, 
  SubCompartment, 
  ShoppingItem,
  Recipe,
  Expense,
  WeeklyMenu
} from '../types';

const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const useSyncHousehold = () => {
  const { user, profile, setProfile, setLoading } = useAuthStore();
  
  useEffect(() => {
    if (!user) {
      console.log("No user authenticated, skipping sync");
      setLoading(false);
      return;
    }

    const syncUser = async () => {
      console.log("Starting sync for user:", user.uid);
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const fetchedProfile = userDoc.data() as UserProfile;
          console.log("Profile found, setting profile state");
          setProfile(fetchedProfile);
        } else {
          console.log("New user: Creating profile and household documents...");
          const householdId = doc(collection(db, 'households')).id;
          const inviteCode = generateInviteCode();

          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            householdId: householdId
          };

          const newHousehold: Household = {
            id: householdId,
            inviteCode: inviteCode,
            members: [user.uid],
            createdAt: new Date().toISOString()
          };

          // 보안 규칙에 따라 순서가 중요할 수 있습니다.
          // 1. 가구 생성
          await setDoc(doc(db, 'households', householdId), newHousehold);
          
          // 2. 기본 칸 생성
          const defaultComps = [
            { id: 'fridge', name: '냉장고', type: 'fridge', iconName: 'Refrigerator', color: '#4A90E2', order: 0, gridSpan: 12, warningThreshold: 5, dangerThreshold: 10 },
            { id: 'freezer', name: '냉동고', type: 'freezer', iconName: 'Snowflake', color: '#00C9FF', order: 1, gridSpan: 12, warningThreshold: 30, dangerThreshold: 60 },
          ];

          for (const comp of defaultComps) {
            await setDoc(doc(db, `households/${householdId}/compartments`, comp.id), comp);
          }

          // 3. 마지막으로 유저 프로필 생성 (순서가 바뀌면 보안 규칙에 걸릴 수 있음)
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
          
          console.log("Migration check...");
          migrateLocalData(householdId);
        }
      } catch (err: any) {
        console.error("Critical Sync Error:", err);
        alert(`로그인 처리 중 오류가 발생했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    syncUser();
  }, [user]);

  useEffect(() => {
    const householdId = profile?.householdId;
    if (!householdId) {
      console.log("No householdId yet, listeners waiting...");
      return;
    }

    console.log("Setting up Firestore listeners for household:", householdId);
    const fridgeStore = useFridgeStore.getState();

    // Listen to items
    const unsubItems = onSnapshot(collection(db, `households/${householdId}/items`), (snapshot) => {
      const items = snapshot.docs.map(d => d.data() as FoodItem);
      console.log("Items synced:", items.length);
      fridgeStore.setItems(items);
    }, (error: unknown) => console.error("Items listener error:", error));

    // Listen to compartments
    const unsubComps = onSnapshot(collection(db, `households/${householdId}/compartments`), (snapshot) => {
      const comps = snapshot.docs.map(d => d.data() as Compartment).sort((a, b) => a.order - b.order);
      console.log("Compartments synced:", comps.length);
      fridgeStore.setCompartments(comps);
    }, (error: unknown) => console.error("Comps listener error:", error));

    // Listen to subCompartments
    const unsubSubComps = onSnapshot(collection(db, `households/${householdId}/subCompartments`), (snapshot) => {
      const subComps = snapshot.docs.map(d => d.data() as SubCompartment);
      console.log("SubCompartments synced:", subComps.length);
      fridgeStore.setSubCompartments(subComps);
    }, (error: unknown) => console.error("SubComps listener error:", error));

    // Listen to shoppingList
    const unsubShop = onSnapshot(collection(db, `households/${householdId}/shoppingList`), (snapshot) => {
      const shop = snapshot.docs.map(d => d.data() as ShoppingItem);
      console.log("Shopping items synced:", shop.length);
      fridgeStore.setShoppingList(shop);
    }, (error: unknown) => console.error("Shop listener error:", error));

    // Listen to recipes
    const unsubRecipes = onSnapshot(collection(db, `households/${householdId}/recipes`), (snapshot) => {
      const recipes = snapshot.docs.map(d => d.data() as Recipe);
      console.log("Recipes synced:", recipes.length);
      fridgeStore.setRecipes(recipes);
    }, (error: unknown) => console.error("Recipes listener error:", error));

    // Listen to expenses
    const unsubExpenses = onSnapshot(collection(db, `households/${householdId}/expenses`), (snapshot) => {
      const expenses = snapshot.docs.map(d => d.data() as Expense);
      console.log("Expenses synced:", expenses.length);
      useLedgerStore.getState().setExpenses(expenses);
    }, (error: unknown) => console.error("Expenses listener error:", error));

    // Listen to categories
    const unsubCategories = onSnapshot(collection(db, `households/${householdId}/categories`), (snapshot) => {
      const categories = snapshot.docs.map(d => (d.data() as { name: string }).name).sort();
      console.log("Categories synced:", categories.length);
      useLedgerStore.getState().setCategories(categories);
    }, (error: unknown) => console.error("Categories listener error:", error));

    // Listen to weeklyMenu
    const unsubWeekly = onSnapshot(collection(db, `households/${householdId}/weeklyMenu`), (snapshot) => {
      const menu = snapshot.docs.map(d => d.data() as WeeklyMenu);
      console.log("Weekly menu synced:", menu.length);
      fridgeStore.setWeeklyMenu(menu);
    }, (error: unknown) => console.error("Weekly menu listener error:", error));

    return () => {
      console.log("Cleaning up Firestore listeners...");
      unsubItems();
      unsubComps();
      unsubSubComps();
      unsubShop();
      unsubRecipes();
      unsubExpenses();
      unsubCategories();
      unsubWeekly();
    };
  }, [profile?.householdId]);
};

const migrateLocalData = async (householdId: string) => {
  const localData = localStorage.getItem('fridge-storage-v9');
  if (!localData) return;

  try {
    const parsed = JSON.parse(localData);
    const state = parsed.state;
    if (!state) return;

    console.log("Migrating items...");
    for (const item of state.items || []) {
      await setDoc(doc(db, `households/${householdId}/items`, item.id), item);
    }

    console.log("Migrating compartments...");
    for (const comp of state.compartments || []) {
      await setDoc(doc(db, `households/${householdId}/compartments`, comp.id), comp);
    }

    console.log("Migrating subCompartments...");
    for (const sc of state.subCompartments || []) {
      await setDoc(doc(db, `households/${householdId}/subCompartments`, sc.id), sc);
    }

    console.log("Migrating shoppingList...");
    for (const shop of state.shoppingList || []) {
      await setDoc(doc(db, `households/${householdId}/shoppingList`, shop.id), shop);
    }

    console.log("Migrating categories...");
    const uniqueCategories = new Set<string>();
    for (const expense of state.expenses || []) {
      uniqueCategories.add(expense.category);
    }
    for (const cat of Array.from(uniqueCategories)) {
      await setDoc(doc(db, `households/${householdId}/categories`, cat), { name: cat });
    }

    console.log('Migration complete');
    // We keep local storage for now just in case.
  } catch (err: unknown) {
    console.error('Migration failed', err);
  }
};
