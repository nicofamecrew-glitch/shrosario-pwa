import OpenAI from "openai";
import type { GuiaResponse } from "@/lib/guia/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type GuiaMessage = {
  role: "user" | "assistant";
  content: string;
};

type GenerateGuiaResponseParams = {
  messages: GuiaMessage[];
};

export async function generateGuiaResponse({
  messages,
}: GenerateGuiaResponseParams): Promise<GuiaResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY");
  }

  const response = await openai.responses.create({
    model: "gpt-5.6-luna",

    reasoning: {
      effort: "none",
    },

    instructions: `
Sos GUÍA, un vendedor especializado en productos profesionales de peluquería.

Estás integrado dentro de un e-commerce.

Respondé de forma breve, natural y comercial.

No actúes como un chatbot genérico.

No afirmes haber agregado productos al carrito, creado pedidos,
consultado stock o realizado acciones que no ejecutaste realmente.

Todavía no tenés acceso al conocimiento especializado ni al catálogo.
Si necesitás datos concretos de productos que no fueron proporcionados,
decí que todavía no tenés ese dato.
`.trim(),

    input: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),

    max_output_tokens: 300,

    text: {
      verbosity: "low",
    },
  });

  return {
    message:
      response.output_text?.trim() ||
      "No pude generar una respuesta.",
    productIds: [],
    close: false,
  };
}