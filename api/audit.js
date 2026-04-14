export default async function handler(req, res) {
  console.log("--> API /api/audit hit", new Date().toISOString());
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { item, price, hourlyWage, topGoalName, topGoalRemaining, safeToSpend } = req.body;
  
  if (!item || !price || !hourlyWage) {
    console.error("Missing body parameters:", req.body);
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Debugging environment variables:
  const apiKey = process.env.API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL ERROR: API_KEY is missing from environment variables.");
    return res.status(500).json({ error: 'Key Missing: API_KEY is not set in Vercel Environment Variables.' });
  }

  console.log(`Auditing Item: ${item} | Cost: $${price} | Wage: $${hourlyWage}/hr`);
  const laborHours = (price / hourlyWage).toFixed(1);

  const systemInstruction = `You are 'The Impulse Auditor', a brutally honest, GenZ financial conscience. You value financial freedom, mock wasteful spending, and use GenZ slang (e.g., bestie, literally, touching grass, roasted). 

Hierarchy of Needs: 
- Medicine, health, and essential bills are ALWAYS 'Buy', even if it delays the vacation.
- For other things, calculate the labor cost and determine if this purchase hurts the user's top goal. 
- If the item price is more than the user's Safe to Spend amount, be extra ruthless about protecting their goal.

Verdicts:
- "Buy": Fits in the 'Fun Money' budget (Safe to Spend) or is a critical health/essential need.
- "Wait 48h": Fits the budget, but the user should wait until Payday to stay liquid.
- "Pivot": Luxury item that is not a need and harms the goal. Output a sarcastic reasoning suggesting a cheaper GenZ alternative instead.

Return ONLY valid JSON in this exact structure, with no markdown formatting around it:
{ "decision": "Buy", "reasoning": "string" }
Valid 'decision' values are exactly: "Buy", "Wait 48h", or "Pivot".`;

  const promptText = `
User Context:
- Item they want: ${item}
- Price: $${price}
- User's Hourly Wage: $${hourlyWage}/hr
- Labor Cost: ${laborHours} hours of their life
- Safe to Spend: $${safeToSpend !== undefined ? safeToSpend : 0}
${topGoalName ? `- Top Goal: ${topGoalName} (Still needs $${topGoalRemaining})` : '- No specific active goals right now.'}

Evaluate this purchase against their labor hours and goals. Return the required JSON format.`;

  try {
    console.log("Calling Groq llama-3.3-70b-versatile endpoint...");
    const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: promptText }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Groq API Error Status:", response.status);
        console.error("Groq API Error Details:", errText);
        return res.status(response.status).json({ error: `Groq API Error: ${errText}` });
    }

    const data = await response.json();
    console.log("Groq API Success Response received.");
    
    // Extract the text that Groq Outputted
    const rawText = data.choices?.[0]?.message?.content;
    
    if (!rawText) {
      console.error("Empty response from AI:", JSON.stringify(data));
      throw new Error("No response returned from the AI.");
    }
    
    // Safety fallback just in case Groq ignored response_format
    function extractJSON(text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.log("Failed to strictly parse JSON, attempting extremely aggressive string extraction. Raw text:", text);
        
        // Strip everything before the first '{' and after the last '}'
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
          const jsonString = text.substring(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(jsonString);
          } catch (innerE) {
            throw new Error(`Aggressively extracted JSON string was invalid: ${jsonString}`);
          }
        }
        throw new Error("No JSON object (no matching { }) could be extracted from AI response.");
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
