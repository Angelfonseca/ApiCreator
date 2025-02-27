import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const GptAPIKey = process.env.AI_API_KEY;

if (!GptAPIKey) throw new Error("Missing OpenAI API Key.");

const systemPromptPG = `You are a developer assistant. You generate Sequelize models based on user inputs. like this. The json shpuld be in the following format ALWAYS: 
{
    "modelos": [
        {
            "name": "user",
            "fields": [
                { "name": "name", "type": "STRING", "allowNull": false },
                { "name": "email", "type": "STRING", "allowNull": false }
            ]
        },
        {
            "name": "post",
            "fields": [
                { "name": "title", "type": "STRING", "allowNull": false },
                { "name": "content", "type": "STRING", "allowNull": false },
                { "name": "userId", "type": "INTEGER", "references": { "model": "user", "key": "id" } }
            ]
        }
    ],
    "projectName": "MyAdPIProject"
}
    Modelos are the tables for the database. Try to separate the response in a JSON format divided into two properties, "text" and "Json". The "text" property should explain the changes.
  dataTypes would be: "STRING", "INTEGER"(ids only), "BOOLEAN", "DATE", "DOUBLE", "DECIMAL", "UUID", "ARRAY", "JSONB", "ENUM", "BLOB", "GEOMETRY", "GEOGRAPHY", "NUMBER"
  `;
  

const systemPromptMDB = `You are a developer assistant. You generate Mongoose models based on user inputs. like this The json shpuld be in the following format ALWAYS:
{
    "modelos": [
        {
            "name": "user",
            "fields": [
                { "name": "name", "type": "STRING", "allowNull": false },
                { "name": "email", "type": "STRING", "allowNull": false }
            ]
        },
        {
            "name": "post",
            "fields": [
                { "name": "title", "type": "STRING", "allowNull": false },
                { "name": "content", "type": "STRING", "allowNull": false },
                { "name": "userId", "type": "NUMBER", "references": { "model": "user", "key": "_id" } }
            ]
        }
    ],
    "projectName": "MyAdPIProject"
}
  Modelos are the tables for the database. Try to separate the response in a JSON format divided into two properties, "text" and "Json". The "text" property should explain the changes.`;



  // Inicialización de APIs
  const GptAPI = new OpenAI({
    apiKey: GptAPIKey,
    baseURL: "https://api.openai.com/v1",
  });

const sendToGpt = async (userPrompt: string, db: string): Promise<{ json: any, text: any } | { error: string, details: string }> => {
   try{
    let systemPrompt = '';
    if(db === 'pg') systemPrompt = systemPromptPG;
    else if(db === 'mdb') systemPrompt = systemPromptMDB;
    else systemPrompt = systemPromptPG;
    const completion = await GptAPI.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const response = completion?.choices?.[0]?.message?.content;
    if (!response) throw new Error("Invalid API response format.");
    return selectJsonFromResponse(response);
  } catch (error: any) {
      console.error("Error in OpenAI API:", error);
      return { error: "An error occurred while processing your request.", details: error.message };
  }
};
const selectJsonFromResponse = (response: string) => {
  try {
    // Convertir la respuesta en un objeto completo
    const parsedResponse = JSON.parse(response);

    // Verificar que tenga las propiedades esperadas
    if (!parsedResponse.Json || !parsedResponse.text) {
      throw new Error("Invalid response format: missing 'Json' or 'text' keys");
    }

    const jsonData = {
      json: parsedResponse.Json,
      text: parsedResponse.text
    };

    // Validar estructura mínima
    if (!Array.isArray(jsonData.json.modelos) || !jsonData.json.projectName) {
      throw new Error("Invalid JSON format: missing required properties");
    }

    console.log("Valid JSON extracted:", jsonData);
    return jsonData;
  } catch (error: any) {
    console.error("Error parsing JSON from response:", error, "\nResponse:", response);
    return { error: "Failed to parse JSON response.", details: error.message };
  }
};


const controller = async (req: any, res: any) => {
    const { userPrompt, db } = req.body;
    if (!userPrompt) {
      res.status(400).json({ error: "Missing user prompt." });
      return;
    }
    const response = await sendToGpt(userPrompt, db);
    res.json({ response });
  };

export default {controller};