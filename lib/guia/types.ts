export type GuiaResponse = {
  message: string;
  productIds: string[];
  close: boolean;
  module?: "tratamientos" | "styling" | "color" | "alisados";
};