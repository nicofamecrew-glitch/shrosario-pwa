import { NextResponse } from "next/server";
import {
  generateGuiaResponse,
  type GuiaMessage,
} from "@/lib/guia/provider";

function isChatMessage(value: unknown): value is GuiaMessage {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    (message.role === "user" ||
      message.role === "assistant") &&
    typeof message.content === "string"
  );
}

export async function POST(request: Request) {
  const startedAt = performance.now();

  try {
    const body = await request.json();

    const messages: GuiaMessage[] =
      Array.isArray(body?.messages)
        ? body.messages
            .filter(isChatMessage)
            .slice(-10)
        : [];

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se recibieron mensajes válidos.",
        },
        { status: 400 }
      );
    }

    const providerStartedAt =
      performance.now();

    const guiaResponse =
      await generateGuiaResponse({
        messages,
      });

    const providerMs = Math.round(
      performance.now() -
        providerStartedAt
    );

    const totalMs = Math.round(
      performance.now() - startedAt
    );

    console.info(
      `[GUÍA PERF] provider_ms=${providerMs} total_ms=${totalMs} messages=${messages.length}`
    );

    return NextResponse.json(
      guiaResponse
    );
  } catch (error) {
    console.error(
      "[GUÍA] Error:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );

    return NextResponse.json(
      {
        error:
          "No pude procesar la consulta.",
      },
      { status: 500 }
    );
  }
}