// Netlify Serverless Function for Receipt Scanning
export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  try {
    const { image, text, categories } = JSON.parse(event.body || '{}');
    const availableCategories = Array.isArray(categories) && categories.length > 0
      ? categories.join(', ')
      : 'Spożywcze & Supermarket, Chemia & Kosmetyki, Mieszkanie & Rachunki, Paliwo & Transport, Zdrowie & Leki, Ubrania & Obuwie, Rozrywka & Wyjścia, Dom i Ogród, Inne';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const contents: any[] = [];
        const promptText = `
Jesteś precyzyjnym systemem OCR i analitykiem paragonów fiskalnych oraz e-paragonów z polskich sklepów (np. Biedronka, Lidl, Dino, Kaufland, Auchan, Carrefour, Rossmann, Hebe, Orlen, BP, Castorama itp.).
Zanalizuj załączony paragon i wyodrębnij:
1. shopName, date (YYYY-MM-DD), totalAmount (liczba), receiptNumber, paymentMethod
2. items: name, quantity, unit, unitPrice, totalPrice, category z [${availableCategories}], isPantryItem, pantryCategory
`;

        if (image) {
          let mimeType = 'image/jpeg';
          let base64Data = image;
          if (image.startsWith('data:')) {
            const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }
          contents.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }

        if (text) {
          contents.push({ text: `TREŚĆ TEKSTOWA E-PARAGONU:\n${text}` });
        }

        contents.push({ text: promptText });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: contents },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                shopName: { type: Type.STRING },
                date: { type: Type.STRING },
                totalAmount: { type: Type.NUMBER },
                receiptNumber: { type: Type.STRING },
                paymentMethod: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                      unitPrice: { type: Type.NUMBER },
                      totalPrice: { type: Type.NUMBER },
                      category: { type: Type.STRING },
                      isPantryItem: { type: Type.BOOLEAN },
                      pantryCategory: { type: Type.STRING },
                    },
                    required: ['name', 'quantity', 'unit', 'totalPrice', 'category', 'isPantryItem'],
                  },
                },
              },
              required: ['shopName', 'date', 'totalAmount', 'items'],
            },
          },
        });

        const responseJson = JSON.parse(response.text || '{}');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ success: true, source: 'gemini-3.8-flash', data: responseJson }),
        };
      } catch (genAiError: any) {
        console.warn('Gemini API call in Netlify function failed:', genAiError);
      }
    }

    // Heuristic fallback response
    const today = new Date().toISOString().split('T')[0];
    const shopName = text && /biedronka/i.test(text) ? 'Biedronka' : text && /lidl/i.test(text) ? 'Lidl' : text && /orlen/i.test(text) ? 'PKN Orlen' : 'Zakupy ze skanu';
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        source: 'netlify-serverless-heuristic',
        data: {
          shopName,
          date: today,
          totalAmount: 0,
          paymentMethod: 'Karta płatnicza',
          items: [
            {
              name: 'Artykuły z paragonu',
              quantity: 1,
              unit: 'szt.',
              unitPrice: 0,
              totalPrice: 0,
              category: 'Spożywcze & Supermarket',
              isPantryItem: true,
              pantryCategory: 'Inne produkty',
            },
          ],
        },
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
