# Refrigerator Management App (냉장고 관리 앱)

## Overview
사용자가 냉장고, 냉동고, 김치냉장고(1층/2층)의 식재료를 한눈에 파악하고 관리할 수 있도록 돕는 애플리케이션입니다. 자주 사용하는 품목을 빠르게 추가/삭제할 수 있는 기능을 제공하며, 시각적으로 직관적인 구획 레이아웃을 제공합니다.

## Project Details
- **Architecture:** React (TypeScript) + Vite
- **State Management:** Zustand
- **Routing:** React Router DOM
- **UI/UX:**
    - **Library:** Material UI (MUI) for professional components
    - **Animations:** Framer Motion for smooth transitions
    - **Icons:** Lucide-React / MUI Icons
    - **Theme:** Modern, Clean, Vibrant colors with subtle textures (Noise background, soft deep shadows)
- **Features:**
    - **Dashboard:** Visual representation of 4 main sections (Refrigerator, Freezer, Kimchi 1, Kimchi 2).
    - **Quick Actions:** Shortcuts for frequently used items (Milk, Eggs, Kimchi, etc.).
    - **Item Management:** Add, edit, remove items with expiry dates and quantities.
    - **Search & Filter:** Find items across all sections easily.
    - **Responsive Design:** Optimized for mobile and desktop.

## Phase 3: Freedom of Layout - COMPLETED
1. **Dynamic Compartment Management:** Users can now add and remove compartments on the fly. [DONE]
2. **Sortable Everything:**
    - Items within a compartment can be reordered via drag-and-drop. [DONE]
    - Compartments themselves can be rearranged in "Edit Layout" mode. [DONE]
3. **Adjustable Card Sizes:** Each compartment card can have its width customized (grid span 2-12) to fit more or fewer items visually. [DONE]
4. **Seamless Workflow:** Added inline quick-add for items that keeps focus, allowing for rapid-fire data entry. [DONE]
5. **Robust State:** Migrated to a more flexible compartment-ID based store to support custom structures. [DONE]

## Phase 4: Cloud Sync & Sharing - COMPLETED
1. **Firebase Authentication:** Google and Email login to secure user data. [DONE]
2. **Firestore Integration:** Real-time synchronization across devices, replacing LocalStorage. [DONE]
3. **Household-based Data Model:** Data is tied to a shared "Household" instead of individual accounts. [DONE]
4. **Invite Code System:** Users can generate and enter 6-digit codes to share their refrigerator with others. [DONE]
5. **Data Migration:** Automatic one-time migration of existing local data to the cloud upon first login. [DONE]

## Phase 5: Household Ledger (가계부) - COMPLETED
1. **Dedicated Ledger Page:** A new page for tracking household expenses with specialized visualizations. [DONE]
2. **Interactive Visualizations:**
    - **Category Breakdown:** Pie chart showing spending distribution with sticky legend. [DONE]
    - **Daily/Monthly/Yearly Trends:** Bar chart with fixed Y-axis and scrollable daily view. [DONE]
3. **Transaction Management:**
    - **Custom Categories:** Users can freely type category names or select from existing ones. [DONE]
    - **Edit/Delete:** Full CRUD capabilities for expenses and category renaming/deletion. [DONE]
    - **Real-time Sync:** All expenses are synchronized across household members via Firestore. [DONE]
4. **Dashboard Summary:** A slim, integrated widget on the main dashboard showing total monthly spending. [DONE]
5. **Global Navigation:** Bottom Navigation bar for seamless switching between views. [DONE]
6. **Advanced Filtering:** Time-based (Month/Year) and Category-based filtering for all charts and lists. [DONE]

## Phase 6: AI Smart Features - COMPLETED
1. **AI Configuration:** New Settings page to securely manage Gemini and OpenAI API keys locally. [DONE]
2. **Floating AI Assistant:** A persistent Sparkle button that opens a smart chat interface. [DONE]
3. **AI Recipe Chef:** Automatically suggests recipes based on current fridge inventory and expiry dates. [DONE]
4. **Smart Expense Analysis:** Analyzes ledger data to provide spending insights and saving tips. [DONE]
5. **Receipt OCR & Auto-Entry:** Multimodal AI support to parse receipt photos and automatically add items to the fridge and expenses to the ledger. [DONE]
6. **Markdown Support:** Rich text rendering for AI responses for better readability. [DONE]
7. **Viral SNS Sharing:** Integrated Web Share API and SNS (Twitter/Facebook) shortcuts in a new enhanced Share Dialog, accessible from Dashboard, Meal Plan, and Ledger. [NEW]

### 7. Recent UI & Feature Enhancements (2026-05-29)
- **Household Ledger (가계부):**
    - **Category Management:** Added a dedicated category management dialog allowing users to add, rename, and delete categories independently of expenses. Categories are now stored as a master list in Firestore. Added auto-sync logic to ensure categories from existing expenses are automatically populated into the master list for existing users. [UPDATED]
    - **Improved Sorting:** Ledger entries are now sorted by date (descending) and then by creation time (descending), ensuring the most recent expenses on the same day appear at the top. [NEW]
- **Item Management:**
    - Registration date (등록일자) is now editable in the Item Edit dialog.
    - Store logic updated to respect manually set registration dates during item addition.
- **Navigation:** Reordered bottom navigation to: 냉장고 (Refrigerator) - 식단 (Meal Plan) - 가계부 (Ledger) - 설정 (Settings).
- **Dashboard Improvements:**
    - Reduced vertical margins for better context efficiency.
    - Today's menu now shows Breakfast/Lunch/Dinner separately with clear labels and colors.
    - Sub-compartment layout fixed for mobile (menu items now appear next to the name instead of on a new line).
    - Added comprehensive compartment management (edit name, adjust warning/danger day thresholds, and deletion).
- **Compartment Detail View:**
    - Integrated threshold settings and deletion features.
    - Added item editing capability (name, quantity, unit, expiry date).
- **Ledger & Meal Plan Headers:**
    - Consistent header design with Cloud sync status and Logout button across all main pages.
- **AI Assistant Refinements:**
    - Compact chat bubbles with better visibility and auto-scroll.
    - Highly optimized Weekly Meal Planner: compact cards for daily plans, fixed selection instructions at the top, and improved mobile layout.
    - Adjusted FAB positions on mobile to prevent overlapping.

### Phase 7: Advanced UI & AI Persistence - COMPLETED
1. **AI Assistant Enhancements:**
    - **Persistence:** Conversation history now persists for 24 hours, allowing users to pick up where they left off. [DONE]
    - **Custom Chat Input:** Added a text input field for direct communication with the AI, moving beyond predefined buttons. [DONE]
    - **Cancellation Support:** Users can now cancel long-running AI requests (chat, recipe suggestions, expense analysis, meal planning) midway through execution. [DONE]
    - **Context Awareness:** The AI now considers current fridge inventory, recent expenses, and conversation history for more relevant and personalized responses. [DONE]
    - **Variety in Recommendations:** Prompts refined to suggest ingredients outside the fridge when appropriate, and provide more diverse menu options. [DONE]
2. **Dashboard & Item Management:**
    - **Clear Storage:** Added a new "Clear Storage" (비우기) feature to quickly delete all items in the refrigerator. [DONE]
    - **Rapid Compartment Addition:** Users can now add new compartments and sub-compartments directly from the item detail/alert setting modal. [DONE]
3. **Drag-and-Drop Reliability:**
    - Improved hit detection for moving items from sub-compartments to parent compartments. [DONE]
    - Enhanced visual feedback during drag-and-drop operations for better clarity and feel. [DONE]
    - Ensured state consistency between local state and Firestore when removing sub-compartment associations. [DONE]

## Content Quality & UX Standards (AdSense Aligned)
This project follows Google's best practices for high-quality content and user experience:
- **Unique Value:** The AI Assistant and Ledger provide personalized insights that go beyond simple data entry.
- **Intuitive Navigation:** A streamlined Bottom Navigation and clear Dashboard hierarchy ensure ease of use.
- **No Redundancy:** Minimalistic design philosophy prevents duplicate pages and ensures every screen adds value.
- **Rich Information:** Automated recipe suggestions and spending analysis provide depth and utility.
- **Transparency:** Clear labels and immediate feedback ensure users always know the state of their data and the result of their actions.

## Phase 8: AI Meal Planner Migration & Integration - COMPLETED
1. **Remove AI Meal Planner from AI Assistant popup:**
   - Simplified `src/components/AIAssistant.tsx` to focus purely on chat, recipe recommendations, receipt scanning, and expense analysis. [DONE]
   - Removed the `mode` tab-toggle from the assistant popup. [DONE]

## Phase 9: AI Chef Enhancement & Meal Planner Integration - COMPLETED
1. **Integrate AI Meal Planner into AI Chef Page (`src/pages/AIChef.tsx`):**
   - Introduced an `activeTab` state (`'recipe' | 'mealPlan' | 'challenge'`) in `src/pages/AIChef.tsx`. [DONE]
   - Added a ToggleButtonGroup to switch between **AI 레시피 추천 (AI Recipe)**, **AI 일주일 식단 (AI Weekly Meal Planner)**, and **냉장고 파먹기 (Fridge Emptying Challenge)**. [DONE]
2. **Refactor & Polish `src/components/MealPlanner.tsx`:**
   - Refactored the daily plan cards layout into a responsive grid. [DONE]
3. **AI Diet Preference Profile (식습관 취향 필터):**
   - Added a multi-select dietary preference filter interface (비건, 저염식, 다이어트, 키토, 맵지 않게, 유아/어린이 등) under Settings page. [DONE]
   - Integrated diet preferences into `aiService.ts` prompts for recipes and weekly menus. [DONE]
4. **AI Fridge Emptying Challenge (냉장고 파먹기 챌린지):**
   - Created a gamified 3-day challenge menu generator targeting expiring items. [DONE]
   - Added an interactive progress tracker, checkbox steps, cost savings badge, and success celebration view in `AIChef.tsx`. [DONE]
   - Managed persistent challenge state in `useAIStore.ts`. [DONE]

## Bug Fixes & Maintenance
1. **Fix `@google/generative-ai` Import Issue:**
   - Fixed `Uncaught SyntaxError: The requested module '/node_modules/.vite/deps/@google_generative-ai.js' does not provide an export named 'Part'`.
   - Resolved by importing `Part` as a type (`import type { Part } from "@google/generative-ai"`) in [aiService.ts](file:///home/user/refrigerator/src/utils/aiService.ts#L2) since `Part` is a TypeScript interface and is not exported at runtime.
2. **Resolve ESLint Errors:**
   - Resolved `react-hooks/purity` warning in [MealPlanner.tsx](file:///home/user/refrigerator/src/components/MealPlanner.tsx#L35) by extracting the impure dynamic ID generation (`generateHoldingId`) outside of the React component body.
   - Resolved `react-hooks/set-state-in-effect` warnings in [AddItemDialog.tsx](file:///home/user/refrigerator/src/components/AddItemDialog.tsx) and [InstallPWA.tsx](file:///home/user/refrigerator/src/components/InstallPWA.tsx) by adding `/* eslint-disable react-hooks/set-state-in-effect */` and refactoring state initializations.
   - Fixed ESLint parser errors in [eslint.config.js](file:///home/user/refrigerator/eslint.config.js#L20) by adding `tsconfig.node.json` to the parser projects list and ignoring `test-browser.cjs`.
3. **Fix Infinite Render Loop in AIChefPage:**
   - Fixed `Maximum update depth exceeded` runtime error in [AIChef.tsx](file:///home/user/refrigerator/src/pages/AIChef.tsx).
   - Resolved by correcting the Zustand selector from `state => state.items[household?.id || ''] || []` to `state => state.items` and removing the unused `useAuthStore` import. The original selector was indexing the flat `state.items` array using a household ID string (which returned `undefined`) and fallbacking to a new array reference `[]` on every render, triggering an infinite update loop in React's `useSyncExternalStore`.

