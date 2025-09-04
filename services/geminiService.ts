/**
 * @file This file contains the service for interacting with the Google Gemini API.
 * It provides a function to get AI-powered feeding predictions for the biogas plant.
 */

import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Represents the analysis of a substrate used for biogas production.
 */
export interface SubstrateAnalysis {
  /** Percentage of lipids in the substrate. */
  lipids: number;
  /** Percentage of proteins in the substrate. */
  proteins: number;
  /** Percentage of carbohydrates in the substrate. */
  carbs: number;
  /** Percentage of total solids (TS) in the substrate. */
  totalSolids: number;
  /** Percentage of volatile solids (VS) as a fraction of total solids. */
  volatileSolids: number;
}

/**
 * Calls the Gemini AI model to get an optimal feeding recommendation.
 * @param {SubstrateAnalysis} analysis - The substrate analysis data.
 * @returns {Promise<string>} A promise that resolves to the AI-generated recommendation in markdown format.
 * @throws {Error} Throws an error if the API call fails or the API key is not configured.
 */
export const getAIFeedingPrediction = async (analysis: SubstrateAnalysis): Promise<string> => {
  if (!process.env.API_KEY) {
    return Promise.reject("API key is not configured.");
  }

  const { lipids, proteins, carbs, totalSolids, volatileSolids } = analysis;

  const prompt = `
    You are an expert consultant for anaerobic digestion and biogas plant operations. 
    Based on the following substrate analysis, recommend the optimal daily feeding amount (in kg) for a standard 5000m3 CSTR biodigester to maximize methane production while ensuring process stability (e.g., keeping FOS/TAC ratio below 0.4).

    Substrate Characterization:
    - Lipids: ${lipids}%
    - Proteins: ${proteins}%
    - Carbohydrates: ${carbs}%
    - Total Solids (TS): ${totalSolids}%
    - Volatile Solids (VS): ${volatileSolids}% of TS

    Provide your recommendation in a clear, concise markdown format. 
    1.  **Recommended Daily Feed (kg):** [Your value]
    2.  **Justification:** [Briefly explain your reasoning based on the provided data, considering factors like organic loading rate, potential for acidification, and methane yield.]
    3.  **Potential Risks:** [Mention any potential risks, e.g., high lipid content leading to foaming, or high protein leading to ammonia inhibition.]
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get AI prediction. Please check your API key and network connection.");
  }
};
