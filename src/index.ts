import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { cors } from "hono/cors";
import { genAI } from "./lib/gen-ai";
import { fileManager } from "./lib/gen-ai";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db/drizzle";
import { measure } from "./db/schema";
import fs from "fs";
import { and, eq } from "drizzle-orm";

require("dotenv").config();

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.get(
  "/:customer_code/list",
  zValidator(
    "param",
    z.object({
      customer_code: z.string(),
    })
  ),
  zValidator("query", z.object({ measure_type: z.string().optional() })),
  async (c) => {
    const { customer_code } = c.req.valid("param");
    const queryParam = c.req.valid("query");
    const measure_type = queryParam?.measure_type;

    if (
      measure_type !== "WATER" &&
      measure_type !== "GAS" &&
      measure_type !== undefined
    ) {
      return c.json(
        {
          error_code: "INVALID_DATA",
          error_description: "Tipo de medidor inválido",
        },
        400
      );
    }

    const whereClause = measure_type
      ? and(
          eq(measure.customer_code, customer_code),
          eq(measure.measure_type, measure_type)
        )
      : eq(measure.customer_code, customer_code);

    const data = await db.select().from(measure).where(whereClause);

    if (data.length === 0) {
      return c.json(
        {
          error_code: "MEASURES_NOT_FOUND",
          error_description: "Nenhuma leitura encontrada",
        },
        404
      );
    }

    return c.json(
      {
        customer_code,
        measures: data,
      },
      200
    );
  }
);

app.post(
  "/upload",
  zValidator(
    "json",
    z.object({
      image: z.string(),
      customer_code: z.string(),
      measure_datetime: z.string(),
      measure_type: z.string(),
    }),
    (result, c) => {
      if (!result.success) {
        if (result.error.issues[0].code === "invalid_type") {
          return c.json(
            {
              error_code: "INVALID_TYPE",
              error_description: `${result.error.issues[0].message}`,
            },
            400
          );
        } else {
          return c.json(
            {
              error_code: "INVALID_DATA",
              error_description: `${result.error.issues[0].message}`,
            },
            400
          );
        }
      }
    }
  ),
  async (c) => {
    const { image, customer_code, measure_datetime, measure_type } =
      c.req.valid("json");

    const measureDate = new Date(measure_datetime);
    const measureYear = measureDate.getFullYear();
    const measureMonth = measureDate.getMonth();

    const data = await db.select().from(measure);

    const hasMatchingDate = data.some((item) => {
      const itemDate = new Date(item.measure_datetime);
      return (
        itemDate.getFullYear() === measureYear &&
        itemDate.getMonth() === measureMonth
      );
    });

    if (hasMatchingDate) {
      return c.json(
        {
          error_code: "DOUBLE_REPORT",
          error_description:
            "Já existe uma leitura para este tipo no mês atual",
        },
        409
      );
    }

    let format;

    const match = image.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
    if (match && match[1]) {
      format = match[1];
    }

    const formattedImage = image.split(",")[1];

    const buffer = Buffer.from(formattedImage, "base64");
    const mediaPath = `${__dirname}/uploads/${customer_code}.${format}`;

    fs.writeFileSync(`${mediaPath}`, buffer);

    const uploadResult = await fileManager.uploadFile(`${mediaPath}`, {
      mimeType: `image/${format}`,
      displayName: `${customer_code}-image`,
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      "Analise a imagem e extraia apenas o valor numérico mostrado no visor do medidor. O valor deve ser composto por dígitos inteiros, dependendo do tipo de medidor. Retorne apenas o número sem qualquer outra informação adicional. Certifique-se de ignorar quaisquer outros elementos visuais na imagem e foque somente no valor numérico do medidor. Se você não conseguir encontrar a mensagem: 'Não foi encontrado nenhum valor numérico. Certifique-se de que a imagem seja legível'",
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    if (
      result.response.text() ===
      "Não foi encontrado nenhum valor numérico. Certifique-se de que a imagem seja legível."
    ) {
      return c.json(
        {
          error_code: "INVALID_DATA",
          error_description: `${result.response.text()}`,
        },
        400
      );
    }

    const id = uuidv4();

    await db.insert(measure).values({
      id,
      customer_code,
      measure_datetime: measure_datetime,
      measure_type,
      measure_value: Number(result.response.text()),
      image_url: uploadResult.file.uri,
    });

    return c.json(
      {
        response: {
          image_url: uploadResult.file.uri,
          measure_value: result.response.text(),
          measure_uuid: id,
        },
        description: "Operação realizada com sucesso",
      },
      200
    );
  }
);

app.patch(
  "/confirm",
  zValidator(
    "json",
    z.object({
      measure_uuid: z.string().uuid(),
      confirmed_value: z.number(),
    }),
    (result, c) => {
      if (!result.success) {
        if (result.error.issues[0].code === "invalid_type") {
          return c.json(
            {
              error_code: "INVALID_TYPE",
              error_description: `${result.error.issues[0].message}`,
            },
            400
          );
        } else {
          return c.json({
            error_code: "INVALID_DATA",
            error_description: `${result.error.issues[0].message}`,
          });
        }
      }
    }
  ),
  async (c) => {
    const { measure_uuid, confirmed_value } = c.req.valid("json");

    const [data] = await db
      .select()
      .from(measure)
      .where(eq(measure.id, measure_uuid));

    if (!data) {
      return c.json(
        {
          error_code: "MEASURE_NOT_FOUND",
          error_description: "Leitura do mês já realizada",
        },
        404
      );
    }

    if (data.has_confirmed === true) {
      return c.json(
        {
          error_code: "CONFIRMATION_DUPLICATE",
          error_description: "Leitura do mês já realizada",
        },
        409
      );
    }

    await db
      .update(measure)
      .set({ has_confirmed: true, measure_value: confirmed_value })
      .where(eq(measure.id, measure_uuid));

    return c.json(
      { description: "Operação realizada com sucesso", success: true },
      200
    );
  }
);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
