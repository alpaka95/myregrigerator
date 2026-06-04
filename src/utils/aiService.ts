import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { useAIStore } from "../store/useAIStore";
import type { FoodItem, Expense } from "../types";

export const aiService = {
  // 사용 가능한 모델 중 generateContent를 지원하는 가장 적합한 모델 찾기
  async getBestModel() {
    const { config } = useAIStore.getState();
    if (!config.geminiApiKey) throw new Error("API 키가 없습니다.");
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "모델 목록 가져오기 실패");
      
      const models = data.models || [];
      
      // 1. 사용자가 설정한 모델이 목록에 있는지 확인 (정규식/부분 일치)
      if (config.geminiModel) {
        // 'gemini-1.5-pro'를 선택했으면 'models/gemini-1.5-pro' 또는 'models/gemini-1.5-pro-latest' 등 매칭
        const found = models.find((m: any) => 
          m.name.includes(config.geminiModel) && 
          m.supportedGenerationMethods.includes('generateContent')
        );
        if (found) return found.name.replace('models/', '');
      }

      // 2. 자동 선택 로직 (우선순위: flash -> pro)
      const flash = models.find((m: any) => 
        m.name.includes('1.5-flash') && 
        m.supportedGenerationMethods.includes('generateContent')
      );
      if (flash) return flash.name.replace('models/', '');
      
      const pro = models.find((m: any) => 
        m.name.includes('1.5-pro') && 
        m.supportedGenerationMethods.includes('generateContent')
      );
      if (pro) return pro.name.replace('models/', '');

      const any = models.find((m: any) => m.supportedGenerationMethods.includes('generateContent'));
      if (any) return any.name.replace('models/', '');

      return config.geminiModel || "gemini-1.5-flash";
    } catch (err) {
      console.warn("[AI] Failed to fetch model list, using fallback ID.");
      return config.geminiModel || "gemini-1.5-flash";
    }
  },

  async safeGenerate(prompt: string, isImage: boolean = false, imageData?: string) {
    const { config } = useAIStore.getState();
    
    if (config.preferredProvider === 'openai') {
      const openai = new OpenAI({ apiKey: config.openaiApiKey, dangerouslyAllowBrowser: true });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content || "";
    }

    // Gemini 처리
    const bestModelId = await this.getBestModel();
    console.log(`[AI] Initializing Gemini with model: ${bestModelId}`);

    const genAI = new GoogleGenerativeAI(config.geminiApiKey!);
    
    // 재시도할 API 버전 목록
    const apiVersions = ['v1', 'v1beta'];
    let lastError = null;

    for (const version of apiVersions) {
      try {
        console.log(`[AI] Trying version: ${version} for model: ${bestModelId}`);
        const model = genAI.getGenerativeModel({ model: bestModelId }, { apiVersion: version as any });
        
        let result;
        if (isImage && imageData) {
          result = await model.generateContent([
            prompt,
            { inlineData: { data: imageData.split(',')[1], mimeType: "image/jpeg" } }
          ]);
        } else {
          result = await model.generateContent(prompt);
        }
        
        const text = result.response.text();
        if (text) return text;
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI] Failed with ${version}: ${err.message}`);
        
        // 할당량 초과는 재시도하지 않음
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          throw new Error("AI 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.");
        }
        
        // 404가 아니면 다른 에러일 수 있으므로 기록하고 다음 버전 시도
        continue;
      }
    }

    // 모든 시도가 실패한 경우
    if (lastError) {
      if (lastError.message?.includes('404')) {
        throw new Error(`[AI 에러] 선택한 모델(${bestModelId})을 찾을 수 없습니다. 설정에서 다른 모델을 선택하거나 나중에 다시 시도해주세요.`);
      }
      throw lastError;
    }
    
    return "";
  },

  async getRecipeChef(items: FoodItem[]) {
    return this.safeGenerate(`냉장고 재료: ${items.map(i => i.name).join(", ") || "계란"}. 요리 3가지 추천. 한국어.`);
  },

  async getExpenseAnalysis(expenses: Expense[]) {
    return this.safeGenerate(`지출 내역: ${expenses.map(e => `${e.category}: ${e.amount}`).join("\n") || "없음"}. 분석 및 팁. 한국어.`);
  },

  async parseReceipt(data: string, isImage: boolean = false) {
    return this.safeGenerate(`영수증 분석 JSON: {"items": [{"name": "품목", "quantity": 1}], "totalAmount": 0}. 영수증: ${isImage ? "[이미지]" : data}`, isImage, data);
  },

  async getWeeklyMealPlan(items: FoodItem[], hasChild: boolean, customRequest?: string) {
    const itemsList = items.map(i => i.name).join(", ") || "계란, 두부, 양파 등 기본 식재료";
    const prompt = `당신은 전문 영양사이자 요리사입니다. 현재 냉장고 재료를 최대한 활용하여 일주일 치(월~일) 아침/점심/저녁 식단을 짜주세요. 
현재 재료: ${itemsList}
대상: ${hasChild ? "유아가 포함된 가족 (맵지 않고 자극적이지 않은 식단 필요)" : "성인 가족"}
추가 요청사항: ${customRequest || "없음"}

결과는 반드시 다음과 같은 JSON 형식으로만 답변해주세요. 다른 설명은 절대 하지 마세요.

{
  "plan": [
    {
      "day": "월요일",
      "breakfast": {"menu": "요리명", "recipeLink": "https://www.10000recipe.com/recipe/list.html?q=요리명", "reason": "추천 이유 (간략히)"},
      "lunch": {"menu": "요리명", "recipeLink": "https://www.10000recipe.com/recipe/list.html?q=요리명", "reason": "추천 이유 (간략히)"},
      "dinner": {"menu": "요리명", "recipeLink": "https://www.10000recipe.com/recipe/list.html?q=요리명", "reason": "추천 이유 (간략히)"}
    }
  ],
  "requiredIngredients": ["사야 할 재료 1", "사야 할 재료 2"],
  "tip": "식단 관리 팁"
}

* 월요일부터 일요일까지 7일치를 모두 포함하세요.
* reason은 왜 이 메뉴를 추천하는지 (예: 냉장고의 OO 재료 활용, 영양 균형 등) 짧게 적어주세요.
* recipeLink는 만개한레시피 검색 결과 주소를 기본으로 하되 가능한 정확하게 만들어주세요.`;

    const response = await this.safeGenerate(prompt);
    if (!response) return null;
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return response;
    } catch (e) {
      return response;
    }
  },

  async listAvailableModels() {
    const { config } = useAIStore.getState();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`);
    const data = await response.json();
    return data.models || [];
  }
};
