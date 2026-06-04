import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIState } from '../types/index';

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      config: {
        preferredProvider: 'gemini',
        geminiModel: 'gemini-1.5-flash',
      },
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
    }),
    {
      name: 'refrigerator-ai-storage',
    }
  )
);
