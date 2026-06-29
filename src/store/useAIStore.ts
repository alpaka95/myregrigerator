import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIState, MealPlanResponse, AIConfig } from '../types/index';

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

export interface ChallengeStep {
  day: number;
  recipeName: string;
  ingredientsUsed: string[];
  instructions: string;
  completed: boolean;
}

export interface EmptyingChallenge {
  id: string;
  startDate: number;
  targetItems: string[];
  steps: ChallengeStep[];
  estimatedSavings: number;
  completed: boolean;
}

interface ExtendedAIState extends AIState {
  config: AIConfig & {
    dietPreferences?: string[];
  };
  messages: AIMessage[];
  mealPlanHistory: MealPlanHistoryItem[];
  activeChallenge: EmptyingChallenge | null;
  setMessages: (messages: AIMessage[]) => void;
  addMessage: (message: Omit<AIMessage, 'timestamp'>) => void;
  clearMessages: () => void;
  addMealPlanToHistory: (plan: MealPlanResponse, requiredIngredients: string[]) => void;
  clearMealPlanHistory: () => void;
  startChallenge: (challenge: EmptyingChallenge) => void;
  toggleChallengeStep: (day: number) => void;
  cancelChallenge: () => void;
}

export const useAIStore = create<ExtendedAIState>()(
  persist(
    (set) => ({
      config: {
        preferredProvider: 'gemini',
        geminiModel: 'gemini-1.5-flash',
        dietPreferences: [],
      },
      messages: [],
      mealPlanHistory: [],
      activeChallenge: null,
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
      startChallenge: (challenge) => set({ activeChallenge: challenge }),
      toggleChallengeStep: (day) => set((state) => {
        if (!state.activeChallenge) return {};
        const updatedSteps = state.activeChallenge.steps.map(step => 
          step.day === day ? { ...step, completed: !step.completed } : step
        );
        const allCompleted = updatedSteps.every(step => step.completed);
        return {
          activeChallenge: {
            ...state.activeChallenge,
            steps: updatedSteps,
            completed: allCompleted
          }
        };
      }),
      cancelChallenge: () => set({ activeChallenge: null }),
    }),
    {
      name: 'refrigerator-ai-storage-v2',
    }
  )
);
