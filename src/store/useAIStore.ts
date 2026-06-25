import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIState, MealPlanResponse } from '../types/index';

export interface AIMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
}

export interface MealPlanHistoryItem {
  id: string;
  timestamp: number;
  plan: MealPlanResponse;
  requiredIngredients: string[];
}

interface ExtendedAIState extends AIState {
  messages: AIMessage[];
  mealPlanHistory: MealPlanHistoryItem[];
  setMessages: (messages: AIMessage[]) => void;
  addMessage: (message: Omit<AIMessage, 'timestamp'>) => void;
  clearMessages: () => void;
  addMealPlanToHistory: (plan: MealPlanResponse, requiredIngredients: string[]) => void;
  clearMealPlanHistory: () => void;
}

export const useAIStore = create<ExtendedAIState>()(
  persist(
    (set) => ({
      config: {
        preferredProvider: 'gemini',
        geminiModel: 'gemini-1.5-flash',
      },
      messages: [],
      mealPlanHistory: [],
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => {
        const newMessage = { ...message, timestamp: Date.now() };
        // Filter out messages older than 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const validMessages = state.messages.filter(m => m.timestamp > oneDayAgo);
        return { messages: [...validMessages, newMessage] };
      }),
      clearMessages: () => set({ messages: [] }),
      addMealPlanToHistory: (plan, requiredIngredients) => set((state) => {
        const newItem: MealPlanHistoryItem = {
          id: `plan_${Date.now()}`,
          timestamp: Date.now(),
          plan,
          requiredIngredients
        };
        const newHistory = [newItem, ...state.mealPlanHistory].slice(0, 3);
        return { mealPlanHistory: newHistory };
      }),
      clearMealPlanHistory: () => set({ mealPlanHistory: [] }),
    }),
    {
      name: 'refrigerator-ai-storage-v2',
    }
  )
);
