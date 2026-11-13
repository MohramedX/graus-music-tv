import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI();

async function getYouTubeTitle(youtubeUrl) {
  const oembedUrl = `https://youtube.com{encodeURIComponent(youtubeUrl)}&format=json`;
  const res = await fetch(oembedUrl);
  if (!res.ok) {
    throw new Error('Link do YouTube inválido ou vídeo privado.');
  }
  const data = await res.json();
  return data.title;
}

app.post('/api/generate', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Cole um link do YouTube válido.' });
    }

    const videoTitle = await getYouTubeTitle(url);

    const prompt = `
      Você é um músico profissional e arranjador especialista em harmonia funcional.
      O usuário quer tocar a música do vídeo do YouTube: "${videoTitle}" (${url}).

      Tarefas:
      1. Identifique o nome limpo da música e do artista.
      2. Pesquise a cifra completa desta música (ex: Cifra Club, Ultimate Guitar, etc.).
      3. Determine a tonalidade principal da música (ex: "G Maior", "Em Menor").
      4. Extraia a sequência de acordes dividida por seções (ex: Intro, Verso 1, Pré-Refrão, Refrão, Ponte, Solo) e converta TODOS os acordes para GRAUS HARMÔNICOS (ex: I, ii, iii, IV, V, vi, V7/vi, IV7M, etc.) referentes ao tom da música.
      5. Organize cada seção em linhas de compassos/frases para facilitar a leitura em uma TV durante um ensaio ou show (sem colocar a letra da música, apenas os graus).
      6. Informe o link da fonte onde a cifra foi baseada.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            key: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  lines: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                },
                required: ['name', 'lines']
              }
            },
            source: { type: Type.STRING },
            warning: { type: Type.STRING }
          },
          required: ['title', 'key', 'sections', 'source', 'warning']
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Erro ao processar a cifra desta música.'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});
