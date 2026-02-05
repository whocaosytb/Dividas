
import { GoogleGenAI } from "@google/genai";
import { Debt } from "../types";

export const analyzeDebts = async (debts: Debt[]): Promise<string> => {
  if (debts.length === 0) {
    return "Você ainda não possui dívidas cadastradas. Comece adicionando uma para receber orientações.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const debtListString = debts.map(d => 
    `- ${d.descricao} (${d.credor}): R$ ${d.valor.toFixed(2)}, Vencimento: ${d.data_limite}`
  ).join('\n');

  const prompt = `
    Como um consultor financeiro especialista, analise a seguinte lista de dívidas de um usuário e forneça uma estratégia curta, direta e motivadora de 3 a 4 parágrafos.
    Destaque qual dívida deve ser priorizada (bola de neve ou avalancha) e dê dicas práticas de economia.
    
    LISTA DE DÍVIDAS:
    ${debtListString}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é um consultor financeiro inteligente chamado 'DebtManager AI'. Sua linguagem deve ser clara, profissional e encorajadora em português do Brasil.",
        temperature: 0.7,
      }
    });

    return response.text || "Não foi possível gerar uma análise no momento. Tente novamente mais tarde.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ops! Tivemos um problema ao conectar com nossa inteligência artificial. Por favor, verifique se sua chave API está configurada.";
  }
};
