import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ SYSTEM INTEGRATION ALERT: GEMINI_API_KEY environment parameter is missing or blank.');
}

const aiProvider = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Define the exact schema structure to enforce native JSON generation out of Gemini
const travelItinerarySchema = {
  type: Type.OBJECT,
  properties: {
    destination: { type: Type.STRING },
    duration: { type: Type.INTEGER },
    budgetType: { type: Type.STRING },
    summary: { type: Type.STRING },
    hotels: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          rating: { type: Type.STRING }, 
          pricePerNight: { type: Type.INTEGER },
          description: { type: Type.STRING },
          whyBookIt: { type: Type.STRING }
        },
        required: ["name", "rating", "pricePerNight", "description", "whyBookIt"]
      }
    },
    budgetBreakdown: {
      type: Type.OBJECT,
      properties: {
        accommodation: { type: Type.INTEGER },
        activities: { type: Type.INTEGER },
        food: { type: Type.INTEGER },
        transport: { type: Type.INTEGER },
        total: { type: Type.INTEGER }
      },
      required: ["accommodation", "activities", "food", "transport", "total"]
    },
    itinerary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          title: { type: Type.STRING },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                description: { type: Type.STRING },
                cost: { type: Type.INTEGER }
              },
              required: ["time", "description", "cost"]
            }
          }
        },
        required: ["day", "title", "activities"]
      }
    }
  },
  required: ["destination", "duration", "budgetType", "summary", "budgetBreakdown", "itinerary"]
};

/**
 * 🛠️ FIX 1: Aligned naming to 'generateNewItinerary' exactly as expected by your controller.
 */
export const generateNewItinerary = async ({ destination, duration, budgetType, interests }) => {
  try {
    // 🏨 SPECIFIC BONUS FEATURE LOGIC MATRIX: Seed target properties context mapping dynamically
    let targetedHotelContext = "";
    
    if (destination.toLowerCase().includes('tokyo')) {
      targetedHotelContext = `
        For a trip to Tokyo, you must select the specific hotel matching the user's budgetType from this list:
        - If budgetType is 'Budget', use: "Hotel Sakura Tokyo"
        - If budgetType is 'Mid-Range', use: "Shinjuku Grand Hotel"
        - If budgetType is 'Luxury', use: "Tokyo Imperial Palace Hotel"
      `;
    } else {
      targetedHotelContext = `Curate a highly recommended real-world hotel located inside ${destination} that aligns perfectly with a "${budgetType}" budget status.`;
    }

    const structuralPrompt = `
      You are an expert commercial travel package system planner. Generate a highly detailed, comprehensive travel itinerary matrix for a trip to "${destination}".
      
      Trip Configuration Specifications:
      - Duration: ${duration} Days
      - Budget Profile Classification: ${budgetType}
      - Specific Hobbies/Interests Context: ${interests.join(', ') || 'General Sightseeing'}

      🏨 HOTEL SELECTION RULE:
      ${targetedHotelContext}
      
      Generate details for this property matching the required json schema definitions, providing a realistic traveler star rating out of 5, an estimated cost per night matching the budget tier, a vivid description, and a 'whyBookIt' key tagline.
    `;

    // Dispatch payload cleanly utilizing our schema config definitions wrapper
    const modelResponse = await aiProvider.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: structuralPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: travelItinerarySchema, // Enforces output array alignment smoothly
      }
    });

    return JSON.parse(modelResponse.text.trim());

  } catch (error) {
    console.error('💥 AI HOTELS INGESTION FAIL:', error.message);
    throw new Error(error.message);
  }
};

/**
 * 🛠️ FIX 2: Added 'regenerateSpecificDay' to handle your individual day revision requests.
 */
export const regenerateSpecificDay = async (currentTrip, dayNumber, userRevisionPrompt) => {
  try {
    // Stringify the target day's current state so the AI understands what it's rewriting
    const targetDayData = currentTrip.itinerary.find(d => d.day === Number(dayNumber));
    const targetDayString = targetDayData ? JSON.stringify(targetDayData) : "No current data.";

    const singleDayPrompt = `
      You are an expert travel coordinator. Rewrite a specific day's activities inside a master travel package itinerary for a trip to "${currentTrip.destination}".
      
      Master Trip Context:
      - Budget Profile: ${currentTrip.budgetType}
      - Core Theme/Interests: ${currentTrip.interests?.join(', ') || 'Sightseeing'}
      
      Target Day Being Revised: Day ${dayNumber}
      Current Activities for Day ${dayNumber}: ${targetDayString}
      
      User's Modification Request Instruction: "${userRevisionPrompt}"
    `;

    const modelResponse = await aiProvider.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: singleDayPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.INTEGER },
            title: { type: Type.STRING },
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  description: { type: Type.STRING },
                  cost: { type: Type.INTEGER }
                },
                required: ["time", "description", "cost"]
              }
            }
          },
          required: ["day", "title", "activities"]
        }
      }
    });

    const responseText = modelResponse.text?.trim();
    if (!responseText) {
      throw new Error('AI Core day regeneration pipeline returned an empty response.');
    }

    return JSON.parse(responseText);

  } catch (error) {
    console.error('💥 DAY REGENERATION CRASH LOG:', error.message);
    throw new Error(`Day regeneration layer fault: ${error.message}`);
  }
};