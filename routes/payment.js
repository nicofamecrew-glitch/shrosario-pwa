import express from "express";
import mercadopago from "../lib/mercadopago.js";

const router = express.Router();

router.post("/create_preference", async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: "Producto de prueba",
          quantity: 1,
          unit_price: 100
        }
      ],
     back_urls: {
  success: "https://newsworthy-gaynelle-unchangeable.ngrok-free.dev/checkout/mp/success",
  failure: "https://newsworthy-gaynelle-unchangeable.ngrok-free.dev/checkout/mp/failure",
  pending: "https://newsworthy-gaynelle-unchangeable.ngrok-free.dev/checkout/mp/pending"

      },
      auto_return: "approved"
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
