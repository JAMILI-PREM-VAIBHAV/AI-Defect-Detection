
import { GoogleGenAI, Type } from "@google/genai";
import { InspectionStatus } from "../types";

export const analyzeProductImage = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Act as a specialized industrial quality control vision system with autonomous product recognition.
            1. Identify the specific type of manufactured product or component in this image.
            2. Identify any visual defects such as scratches, cracks, misalignments, label issues, or color inconsistencies. 
            3. For each defect found, provide its location as a bounding box [ymin, xmin, ymax, xmax] using normalized coordinates from 0 to 1000.
            4. Determine if the product should PASS or FAIL quality standards based on general industrial excellence.
            Return the results in the specified JSON format.`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productType: {
            type: Type.STRING,
            description: "The identified category of the product (e.g., 'Circuit Board', 'Machined Part', etc.)"
          },
          status: {
            type: Type.STRING,
            description: "PASS or FAIL status based on quality control standards."
          },
          confidence: {
            type: Type.NUMBER,
            description: "Confidence score from 0 to 1."
          },
          defects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                severity: { type: Type.STRING, description: "low, medium, or high" },
                boundingBox: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: "[ymin, xmin, ymax, xmax] coordinates from 0-1000"
                }
              },
              required: ["type", "description", "severity"]
            }
          }
        },
        required: ["productType", "status", "confidence", "defects"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return {
      productType: "Unknown Asset",
      status: InspectionStatus.FAIL,
      confidence: 0,
      defects: [{ type: "Error", description: "Could not analyze image", severity: "high" }]
    };
  }
};
