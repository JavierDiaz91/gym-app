import { neon } from "@neondatabase/serverless";

export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está definida en las variables de entorno.");
  }
  const query = neon(databaseUrl);
  return query(strings, ...values);
};