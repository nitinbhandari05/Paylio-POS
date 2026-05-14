import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env.js";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Smart POS & Inventory Analytics API",
      version: "1.0.0",
      description: "Production-grade POS, inventory, order, payment, and analytics backend.",
    },
    servers: [{ url: `http://${env.host}:${env.port}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js", "./src/docs/*.yaml"],
});
