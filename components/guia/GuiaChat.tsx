"use client";

import { FormEvent, useState } from "react";
import type { GuiaResponse } from "@/lib/guia/types";
import type { Product } from "@/lib/types";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import GuideProductCard from "@/components/guia/GuideProductCard";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  productIds?: string[];
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hola. Soy GUÍA. ¿Qué estás buscando hoy para tu peluquería?",
  },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findMatchingProducts(
  products: Product[],
  query: string
) {
  const normalizedQuery = normalizeText(query);

  const ignoredWords = new Set([
    "quiero",
    "tenes",
    "tengo",
    "dame",
    "ver",
    "para",
    "una",
    "uno",
    "con",
    "que",
    "del",
    "los",
    "las",
  ]);

  const words = normalizedQuery
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 3 &&
        !ignoredWords.has(word)
    );

  if (words.length === 0) {
    return [];
  }

  return products
    .map((product) => {
      const searchable = normalizeText(
        [
          product.name,
          product.brand,
          product.line,
          product.category,
          ...(product.tags ?? []),
          ...product.variants.map(
            (variant) => variant.size
          ),
        ]
          .filter(Boolean)
          .join(" ")
      );

      const matchedWords = words.filter(
        (word) => searchable.includes(word)
      );

      return {
        product,
        matchedWords: matchedWords.length,
      };
    })
    .filter(
      (item) =>
        item.matchedWords === words.length
    )
    .slice(0, 3)
    .map((item) => item.product);
}

export default function GuiaChat() {
  const [messages, setMessages] =
    useState<Message[]>(INITIAL_MESSAGES);

  const [input, setInput] = useState("");

  const products = useCatalogStore(
    (state) => state.products
  );

  function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const content = input.trim();

    if (!content) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    // Si el catálogo todavía no cargó,
    // no interpretamos eso como "no encontré".
    if (products.length === 0) {
      const loadingMessage: Message = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content:
          "Estoy cargando el catálogo. Probá nuevamente en un instante.",
      };

      setMessages((current) => [
        ...current,
        userMessage,
        loadingMessage,
      ]);

      setInput("");
      return;
    }

    const matchedProducts =
      findMatchingProducts(
        products,
        content
      );

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");

    // MOCK LOCAL.
    // Después se reemplaza por /api/guia/chat.
    window.setTimeout(() => {
      const guiaResponse: GuiaResponse = {
        message:
          matchedProducts.length === 0
            ? "No encontré un producto claro con esa búsqueda."
            : matchedProducts.length === 1
            ? "Tengo esta opción."
            : "Tengo estas opciones.",

        productIds: matchedProducts.map(
          (product) => product.id
        ),

        close: false,
      };

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: guiaResponse.message,
        productIds: guiaResponse.productIds,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    }, 500);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* CONVERSACIÓN */}
      <div className="flex-1 space-y-3 overflow-y-auto py-5 pb-[160px]">
        {messages.map((message) => {
          const isUser =
            message.role === "user";

          return (
            <div
              key={message.id}
              className={[
                "flex flex-col gap-3",
                isUser
                  ? "items-end"
                  : "items-start",
              ].join(" ")}
            >
              {/* BURBUJA */}
              <div
                className={[
                  "max-w-[85%] rounded-[20px] px-4 py-3",
                  "text-[14px] leading-relaxed",
                  isUser
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/10 text-white",
                ].join(" ")}
              >
                {message.content}
              </div>

              {/* PRODUCTOS */}
              {message.role === "assistant" &&
                message.productIds?.map(
                  (productId) => {
                    const product =
                      products.find(
                        (item) =>
                          item.id === productId
                      );

                    if (!product) {
                      return null;
                    }

                    return (
                      <div
                        key={`${message.id}-${productId}`}
                        className="w-full max-w-[92%]"
                      >
                        <GuideProductCard
                          product={product}
                        />
                      </div>
                    );
                  }
                )}
            </div>
          );
        })}
      </div>

      {/* INPUT SIEMPRE VISIBLE */}
<div className="sticky bottom-[95px] z-40 mt-auto">
  <form onSubmit={handleSubmit}>
    <div
      className="
        flex items-center gap-2
        rounded-[22px]
        border border-white/15
        bg-black/90
        backdrop-blur-xl
        p-2
        shadow-[0_10px_35px_rgba(0,0,0,0.6)]
      "
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribile a GUÍA..."
        className="
          min-w-0 flex-1
          bg-transparent
          px-3 py-2
          text-base text-white
          outline-none
          placeholder:text-white/35
        "
      />

      <button
        type="submit"
        disabled={!input.trim()}
        aria-label="Enviar mensaje"
        className="
          grid h-11 w-11 shrink-0 place-items-center
          rounded-full
          bg-gradient-to-br from-violet-600 to-fuchsia-500
          text-white
          transition
          active:scale-95
          disabled:opacity-30
        "
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 19V5M6.5 10.5 12 5l5.5 5.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  </form>
</div>
</div>
  );
}