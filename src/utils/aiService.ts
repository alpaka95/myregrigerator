import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { useAIStore } from "../store/useAIStore";
import type { FoodItem, Expense } from "../types";

export const aiService = {
  // 사용 가능한 모델 중 generateContent를 지원하는 가장 적합한 모델 찾기
  async getBestModel(signal?: AbortSignal) {
    const { config } = useAIStore.getState();
    if (!config.geminiApiKey) throw new Error("API 키가 없습니다.");
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`,
        { signal }
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
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn("[AI] Failed to fetch model list, using fallback ID.");
      return config.geminiModel || "gemini-1.5-flash";
    }
  },

  async safeGenerate(prompt: string, isImage: boolean = false, imageData?: string, history: any[] = [], signal?: AbortSignal) {
    const { config } = useAIStore.getState();
    
    if (config.preferredProvider === 'openai') {
      const openai = new OpenAI({ apiKey: config.openaiApiKey, dangerouslyAllowBrowser: true });
      const messages = history.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
      messages.push({ role: "user", content: prompt });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
      }, { signal });
      return response.choices[0].message.content || "";
    }

    // Gemini 처리
    const bestModelId = await this.getBestModel(signal);
    console.log(`[AI] Initializing Gemini with model: ${bestModelId}`);

    const genAI = new GoogleGenerativeAI(config.geminiApiKey!);
    
    // 재시도할 API 버전 목록
    const apiVersions = ['v1', 'v1beta'];
    let lastError = null;

    for (const version of apiVersions) {
      if (signal?.aborted) throw new Error("AbortError");
      
      try {
        console.log(`[AI] Trying version: ${version} for model: ${bestModelId}`);
        const model = genAI.getGenerativeModel({ model: bestModelId }, { apiVersion: version as any });
        
        const chat = model.startChat({
          history: history.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        });

        let result;
        if (isImage && imageData) {
          result = await model.generateContent([
            prompt,
            { inlineData: { data: imageData.split(',')[1], mimeType: "image/jpeg" } }
          ]);
        } else {
          result = await chat.sendMessage(prompt);
        }
        
        if (signal?.aborted) throw new Error("AbortError");
        
        const text = result.response.text();
        if (text) return text;
      } catch (err: any) {
        lastError = err;
        if (err.name === 'AbortError' || err.message === 'AbortError') throw err;
        console.warn(`[AI] Failed with ${version}: ${err.message}`);
        
        // 할당량 초과는 재시도하지 않음
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          throw new Error("AI 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.");
        }
        
        continue;
      }
    }

    if (lastError) {
      if (lastError.message?.includes('404')) {
        throw new Error(`[AI 에러] 선택한 모델(${bestModelId})을 찾을 수 없습니다. 설정에서 다른 모델을 선택하거나 나중에 다시 시도해주세요.`);
      }
      throw lastError;
    }
    
    return "";
  },

  async chat(message: string, history: any[], items: FoodItem[], expenses: Expense[], signal?: AbortSignal) {
    const context = `
당신은 우리집 냉장고를 관리해주는 똑똑한 AI 어시스턴트입니다.
현재 냉장고 재료: ${items.map(i => i.name).join(", ") || "비어있음"}
최근 지출 내역 요약: ${expenses.slice(0, 5).map(e => `${e.category}(${e.amount}원)`).join(", ")}

사용자의 질문에 친절하고 구체적으로 답변해주세요. 
요청이 있다면 냉장고에 없는 재료를 사용한 요리도 기꺼이 추천해주시고, 식재료 관리 팁이나 절약 방법도 알려주세요.
이전 대화 흐름을 고려하여 자연스럽게 대화하세요. 만약 사용자가 같은 질문을 반복한다면, 이전 답변과는 다른 관점이나 추가 정보를 제공하여 더 풍부한 대화를 이끌어주세요.
`;
    return this.safeGenerate(`${context}\n\n사용자: ${message}`, false, undefined, history, signal);
  },

  async getRecipeChef(items: FoodItem[], signal?: AbortSignal) {
    const { config } = useAIStore.getState();
    const dietPrefText = config.dietPreferences && config.dietPreferences.length > 0
      ? `\n사용자 식습관 선호(필터): ${config.dietPreferences.join(", ")} (반드시 이 선호사항에 맞거나 적합한 레시피로 구성해주세요)`
      : "";

    const prompt = `냉장고 재료: ${items.map(i => i.name).join(", ") || "계란, 파, 김치"}. 
위의 재료를 주재료로 하되, 집에 있을법한 기본 양념이나 저렴하게 구입 가능한 부재료를 추가하여 만들 수 있는 맛있는 요리 3가지를 추천해줘.
각 요리마다 필요한 재료(냉장고에 있는 것 vs 추가로 필요한 것), 간단한 레시피, 그리고 추천 이유를 설명해줘. 한국어로 친절하게 답변해줘.${dietPrefText}`;
    return this.safeGenerate(prompt, false, undefined, [], signal);
  },

  async getExpenseAnalysis(expenses: Expense[], signal?: AbortSignal) {
    return this.safeGenerate(`지출 내역: ${expenses.map(e => `${e.category}: ${e.amount}`).join("\n") || "없음"}. 
이 데이터를 바탕으로 현재 소비 패턴을 분석하고, 식비를 절약할 수 있는 구체적인 팁을 3가지 이상 제공해줘. 한국어로 답변해줘.`, false, undefined, [], signal);
  },

  async parseReceipt(data: string, isImage: boolean = false, signal?: AbortSignal) {
    return this.safeGenerate(`영수증 분석 JSON: {"items": [{"name": "품목", "quantity": 1, "unit": "개"}], "totalAmount": 0, "storeName": "가게이름", "date": "YYYY-MM-DD"}. 영수증: ${isImage ? "[이미지]" : data}`, isImage, data, [], signal);
  },

  async getWeeklyMealPlan(items: FoodItem[], hasChild: boolean, useFridge: boolean, customRequest?: string, schoolMealMode: boolean = false, signal?: AbortSignal) {
    const { config } = useAIStore.getState();
    const itemsList = useFridge ? (items.map(i => i.name).join(", ") || "계란, 두부, 양파 등 기본 식재료") : "사용 가능한 모든 식재료";
    const dietPrefText = config.dietPreferences && config.dietPreferences.length > 0
      ? `\n사용자 식습관 선호 필터: ${config.dietPreferences.join(", ")} (식단 구성 시 이 선호/제한 사항을 철저히 반영하여 구성해주세요)`
      : "";
    
    let contextStr = "";
    if (schoolMealMode) {
      contextStr = `대한민국 학교 급식(초등 및 유아) 식단 빅데이터와 영양 기준을 바탕으로 일주일 치(월~일) 아침/점심/저녁 식단을 짜주세요.
단순 메뉴가 아니라 '밥, 국, 메인반찬, 보조반찬, 김치/후식'의 급식 구성 패턴을 따라주세요. 
저염식, 영양 균형, 아이들이 선호하는 메뉴 패턴을 최우선으로 고려하세요.`;
    } else {
      contextStr = useFridge 
        ? `현재 냉장고 재료를 최대한 활용하여 일주일 치(월~일) 아침/점심/저녁 식단을 짜주세요. 
현재 재료: ${itemsList}`
        : `일주일 치(월~일) 건강하고 맛있는 아침/점심/저녁 식단을 짜주세요. 냉장고 재료에 국한되지 않고 다양한 메뉴를 추천해주세요.`;
    }

    const prompt = `당신은 전문 영양사이자 학교 급식 조리사입니다. ${contextStr}
대상: ${hasChild ? "초등학생 및 유아가 포함된 가족 (성장기 영양 보충 필요)" : "성인 가족"}
추가 요청사항: ${customRequest || "없음"}${dietPrefText}
 
결과는 반드시 다음과 같은 JSON 형식으로만 답변해주세요. 다른 설명은 절대 하지 마세요.

{
  "plan": [
    {
      "day": "월요일",
      "breakfast": {"menu": "요리명", "recipeLink": "https://www.10000recipe.com/recipe/list.html?q=요리명", "reason": "영양 포인트 (간략히)"},
      "lunch": {"menu": "요리명", "recipeLink": "https://www.10000recipe.com/recipe/list.html?q=요리명", "reason": "패턴 분석 근거 (간략히)"},
      "dinner": {"menu": "요리명", "recipeLink": "https://www.10000recipe.com/recipe/list.html?q=요리명", "reason": "조합 이유 (간략히)"}
    }
  ],
  "requiredIngredients": ["사야 할 재료 1", "사야 할 재료 2"],
  "tip": "식단 관리 및 영양 팁"
}

* 월요일부터 일요일까지 7일치를 모두 포함하세요.
* schoolMealMode가 true일 경우 menu에 '현미밥, 소고기미역국, 돈가스, 멸치볶음, 깍두기' 처럼 전체 상차림 구성을 적어주세요.
* recipeLink는 대표 메뉴 하나를 기준으로 만개한레시피 검색 결과 주소를 만들어주세요.`;

    const response = await this.safeGenerate(prompt, false, undefined, [], signal);
    if (!response) return null;
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return response;
    } catch {
      return response;
    }
  },

  async getEmptyingChallenge(items: FoodItem[], signal?: AbortSignal) {
    const { config } = useAIStore.getState();
    const dietPrefText = config.dietPreferences && config.dietPreferences.length > 0
      ? `\n사용자 식습관 선호 필터: ${config.dietPreferences.join(", ")}`
      : "";

    const targetItemsList = items
      .filter(i => i.expiryDate)
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
      .slice(0, 5)
      .map(i => i.name);

    const itemsText = targetItemsList.length > 0
      ? targetItemsList.join(", ")
      : (items.slice(0, 5).map(i => i.name).join(", ") || "두부, 계란, 파");

    const prompt = `당신은 식자재 낭비를 막고 절약을 돕는 전문 셰프입니다.
현재 유통기한이 임박하여 냉장고에서 빨리 소비해야 할 식재료 후보군: ${itemsText}

위의 식재료 후보군 중 2~3가지를 확실하게 소비할 수 있는 '3일 냉장고 털기 챌린지' 식단을 설계해 주세요.
각 날짜별(1일차, 2일차, 3일차)로 1가지 메인 요리 레시피를 제안해야 합니다.

결과는 반드시 다음과 같은 JSON 형식으로만 답변해주세요. 다른 설명은 절대 하지 마세요.

{
  "targetItems": ["소비한 재료 1", "소비한 재료 2"],
  "estimatedSavings": 35000,
  "steps": [
    {
      "day": 1,
      "recipeName": "요리명 1",
      "ingredientsUsed": ["사용한 재료 1", "사용한 재료 2"],
      "instructions": "레시피 요약 및 상세 조리법 단계별 설명 (마크다운 없이 텍스트로 작성)"
    },
    {
      "day": 2,
      "recipeName": "요리명 2",
      "ingredientsUsed": ["사용한 재료 1"],
      "instructions": "레시피 요약 및 상세 조리법 단계별 설명"
    },
    {
      "day": 3,
      "recipeName": "요리명 3",
      "ingredientsUsed": ["사용한 재료 1", "사용한 재료 3"],
      "instructions": "레시피 요약 및 상세 조리법 단계별 설명"
    }
  ]
}

* estimatedSavings는 외부에서 재료를 사지 않고 냉장고 안에서 해결함으로써 절약되는 예상 비용(원 단위 숫자, 예: 30000)을 현실적으로 적어주세요.
* 한국어로 친절하게 작성해주세요.${dietPrefText}`;

    const response = await this.safeGenerate(prompt, false, undefined, [], signal);
    if (!response) return null;
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return response;
    } catch {
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
