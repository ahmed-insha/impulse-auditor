export default async function handler(req, res) {
  console.log("--> API /api/audit hit", new Date().toISOString());
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { item, price, hourlyWage, topGoalName, topGoalRemaining } = req.body;
  
  if (!item || !price || !hourlyWage) {
    console.error("Missing body parameters:", req.body);
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Debugging environment variables:
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL ERROR: API_KEY is missing from environment variables.");
    return res.status(500).json({ error: 'Key Missing: API_KEY is not set in Vercel Environment Variables.' });
  }

  console.log(`Auditing Item: ${item} | Cost: $${price} | Wage: $${hourlyWage}/hr`);
  const laborHours = (price / hourlyWage).toFixed(1);

  const systemInstruction = `You are 'The Impulse Auditor', a brutally honest, GenZ financial conscience. You value financial freedom, mock wasteful spending, and use GenZ slang (e.g., bestie, literally, touching grass, roasted). 
You must calculate the labor cost and determine if this purchase hurts the user's top goal.
Return ONLY valid JSON in this exact structure, with no markdown formatting around it:
{ "decision": "Buy", "reasoning": "string" }
Valid 'decision' values are exactly: "Buy", "Wait 48h", or "Pivot".`;

  const promptText = `
User Context:
- Item they want: ${item}
- Price: $${price}
- User's Hourly Wage: $${hourlyWage}/hr
- Labor Cost: ${laborHours} hours of their life
${topGoalName ? `- Top Goal: ${topGoalName} (Still needs $${topGoalRemaining})` : '- No specific active goals right now.'}

Evaluate this purchase against their labor hours and goals. Return the required JSON format.`;

  try {
    console.log("Calling Gemini 1.5 Flash endpoint...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          parts: [{ text: promptText }]
        }],
        generation_config: {
          response_mime_type: "application/json",
          temperature: 0.8
        }
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API Error Status:", response.status);
        console.error("Gemini API Error Details:", errText);
        return res.status(response.status).json({ error: `Gemini API Error: ${errText}` });
    }

    const data = await response.json();
    console.log("Gemini API Success Response received.");
    
    // Extract the text that Gemini Outputted
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) {
      console.error("Empty response from AI:", JSON.stringify(data));
      throw new Error("No response returned from the AI.");
    }
    
    // Safety fallback just in case Gemini ignored responseMimeType
    function extractJSON(text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.log("Failed to strictly parse JSON, attempting string extraction. Raw text:", text);
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
           try {
             return JSON.parse(jsonMatch[0]);
           } catch (innerE) {
             throw new Error("Extracted JSON string was invalid.");
           }
        }
        throw new Error("No JSON object could be extracted from AI response.");
      }
    }
    
    const result = extractJSON(rawText);
    
    console.log("Returning result to client:", result);
    return res.status(200).json(result);

  } catch (error) {
    console.error("Full AI Audit Error:", error);
    return res.status(500).json({ error: 'Failed to process the vibe check.', details: error.message });
  }
}
