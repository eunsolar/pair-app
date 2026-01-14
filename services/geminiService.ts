
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCharacterDialogue = async (
  character: { 
    name: string; 
    personality: string; 
    detailedSetting: string; 
    reports: string[];
    sampleDialogue: string;
  },
  context: "praise" | "nag" | "fortune",
  data?: { taskName?: string; fortuneLevel?: string }
) => {
  try {
    const prompt = `
      캐릭터 이름: ${character.name}
      성격 키워드: ${character.personality}
      상세 설정: ${character.detailedSetting}
      평소 말투 예시: ${character.sampleDialogue}
      과거 피드백(수정사항): ${character.reports.join(", ")}

      상황: ${context === 'praise' ? `사용자가 '${data?.taskName}' 할 일을 완료함. 칭찬해줘.` : 
             context === 'nag' ? `사용자가 '${data?.taskName}' 할 일을 미룸. 잔소리해줘.` : 
             `사용자가 뽑은 운세 등급: ${data?.fortuneLevel}. 이 운세를 해석해주고 캐릭터만의 반응을 보여줘.`}

      위 설정을 바탕으로 캐릭터의 말투와 성격을 완벽히 반영한 2~3문장의 대사를 작성해줘. 
      친근한 메신저 말투를 사용하고, 예시 대사의 어조와 종결어미를 최대한 유지해줘.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Dialogue Generation Error:", error);
    return "오늘도 힘내세요!";
  }
};

export const analyzeCharacterProfile = async (name: string, personality: string, setting: string) => {
  try {
    const prompt = `캐릭터 '${name}' (성격: ${personality}, 설정: ${setting})의 특징을 분석해서 이 캐릭터가 주로 사용할 만한 종결어미나 말투의 특징 3가지를 알려줘. 한국어로 요약해줘.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    return "분석 중 오류가 발생했습니다.";
  }
};
