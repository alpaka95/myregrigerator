export type CompartmentType = 'fridge' | 'freezer' | 'kimchi1' | 'kimchi2' | 'veggies' | 'sauces' | 'fruits' | string;

export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  category: string;
  compartmentId: string;
  subCompartmentId?: string;
  addedAt: string;
  sortOrder: number;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export interface SubCompartment {
  id: string;
  name: string;
  parentId: string;
}

export interface Compartment {
  id: string;
  name: string;
  type: string;
  iconName: string;
  color: string;
  order: number;
  gridSpan: number;
  warningThreshold: number;
  dangerThreshold: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  sortOrder: number;
}

export interface Recipe {
  id: string;
  name: string;
  link?: string;
  imageUrl?: string;
  createdAt: string;
  sortOrder: number;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  comment: string;
  date: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  householdId: string | null;
}

export interface MealPlanDay {
  day: string;
  breakfast: { menu: string; recipeLink: string; reason?: string };
  lunch: { menu: string; recipeLink: string; reason?: string };
  dinner: { menu: string; recipeLink: string; reason?: string };
}

export interface MealPlanResponse {
  plan: MealPlanDay[];
  requiredIngredients: string[];
}

export interface Household {
  id: string;
  inviteCode: string;
  members: string[];
  createdAt: string;
}

export interface AIConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  geminiModel?: string;
  preferredProvider: 'gemini' | 'openai';
  dietPreferences?: string[];
}

export interface AIState {
  config: AIConfig;
  updateConfig: (updates: Partial<AIConfig>) => void;
}

export interface WeeklyMenu {
  id: string; // e.g., 'monday_breakfast', 'monday_lunch', 'monday_dinner', or 'holding_area'
  day: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'holding';
  menu: string;
  recipeLink?: string;
  isCompleted?: boolean;
  updatedAt?: string;
  updatedBy?: string;
  lastReadBy?: string[]; // To track who has seen the update
}

export interface RefrigeratorState {
  items: FoodItem[];
  compartments: Compartment[];
  subCompartments: SubCompartment[];
  shoppingList: ShoppingItem[];
  recipes: Recipe[];
  weeklyMenu: WeeklyMenu[];
  lastDeletedItem: FoodItem | null;
  addItem: (item: Omit<FoodItem, 'id' | 'addedAt' | 'sortOrder'>) => void;
  removeItem: (id: string) => void;
  undoDelete: () => void;
  updateItem: (id: string, updates: Partial<FoodItem>) => void;
  reorderItems: (compartmentId: string, newOrderIds: string[]) => void;
  addCompartment: (comp: Omit<Compartment, 'id' | 'order'>) => void;
  removeCompartment: (id: string) => void;
  updateCompartment: (id: string, updates: Partial<Compartment>) => void;
  reorderCompartments: (newOrderIds: string[]) => void;
  addSubCompartment: (parentId: string, name: string) => void;
  removeSubCompartment: (id: string) => void;
  updateSubCompartment: (id: string, name: string) => void;
  addShoppingItem: (name: string) => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearCompletedShopping: () => void;
  reorderShoppingList: (newOrderIds: string[]) => void;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'sortOrder'>) => void;
  removeRecipe: (id: string) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  reorderRecipes: (newOrderIds: string[]) => void;
  setWeeklyMenu: (menu: WeeklyMenu[]) => void;
  updateWeeklyMenu: (id: string, menu: string, recipeLink?: string) => Promise<void>;
  swapWeeklyMenu: (sourceId: string, targetId: string) => Promise<void>;
  toggleWeeklyMenuComplete: (id: string) => Promise<void>;
  clearWeeklySlots: () => Promise<void>;
  clearArchive: () => Promise<void>;
  markWeeklyMenuAsRead: (id: string) => Promise<void>;
}

export interface LedgerState {
  expenses: Expense[];
  categories: string[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  removeExpense: (id: string) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  updateCategory: (oldCategory: string, newCategory: string) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  setExpenses: (expenses: Expense[]) => void;
  setCategories: (categories: string[]) => void;
  syncCategoriesFromExpenses: () => Promise<void>;
}
