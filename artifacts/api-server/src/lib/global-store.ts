import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { rows } from "./management-db";
import { STORE_COUNTRIES, COUNTRY_CODES, CURRENCY_CODES } from "./store-countries";
import { displayExchangeRates } from "./store-exchange-rates";
import type { Request } from "express";

const KEY = "imaginate_global_store";
export function selectedStoreCountry(req: Request): string | undefined {
  const cookie = req.headers.cookie?.match(/(?:^|;\s*)imaginate_country=([A-Z]{2})(?:;|$)/)?.[1];
  const previous = (req.session as Record<string,unknown> | undefined)?.storeCountry;
  return cookie ?? (typeof previous==="string" && /^[A-Z]{2}$/.test(previous) ? previous : undefined);
}
const countrySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/), name: z.string().max(150),
  currency: z.string().regex(/^[A-Z]{3}$/), enabled: z.boolean(),
  shippingAED: z.number().finite().positive().max(10000).nullable(),
});
const methodSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/), label: z.string().trim().min(1).max(100),
  provider: z.enum(["cod", "ziina"]), enabled: z.boolean(),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(250),
});
export const globalConfigSchema = z.object({
  enabled: z.boolean(), revision: z.number().int().nonnegative(),
  countries: z.array(countrySchema).max(250),
  paymentMethods: z.array(methodSchema).max(20),
}).superRefine((config, ctx) => {
  if (new Set(config.countries.map(c => c.code)).size !== config.countries.length ||
      new Set(config.paymentMethods.map(m => m.id)).size !== config.paymentMethods.length)
    ctx.addIssue({code:"custom",message:"Country and payment method identifiers must be unique."});
  for (const c of config.countries)
    if (!COUNTRY_CODES.has(c.code) || !CURRENCY_CODES.has(c.currency))
      ctx.addIssue({code:"custom",message:"Select a valid country and currency."});
  for (const m of config.paymentMethods) {
    if (m.countries.some(code => !COUNTRY_CODES.has(code)))
      ctx.addIssue({code:"custom",message:"Unknown payment country."});
    if (m.provider === "cod" && (m.countries.length !== 1 || m.countries[0] !== "AE"))
      ctx.addIssue({code:"custom",message:"Cash on delivery can only be assigned to UAE (AE)."});
  }
});
export type GlobalStoreConfig = z.infer<typeof globalConfigSchema>;

export function defaultGlobalConfig(): GlobalStoreConfig {
  return {enabled:false,revision:0,countries:STORE_COUNTRIES.map(c => ({...c})),paymentMethods:[
    {id:"cod",label:"Cash on delivery",provider:"cod",enabled:true,countries:["AE"]},
    {id:"ziina",label:"Pay online with Ziina",provider:"ziina",enabled:true,countries:[]},
  ]};
}
export const providerStatus = () => ({cod:true,ziina:!!process.env.ZIINA_ACCESS_TOKEN});
export async function getGlobalConfig(): Promise<GlobalStoreConfig> {
  const raw = rows(await db.execute(sql`SELECT value FROM site_settings WHERE key=${KEY}`))[0];
  if (!raw) return defaultGlobalConfig();
  const value = globalConfigSchema.safeParse(JSON.parse(raw.value));
  if (!value.success) throw new Error("Global store configuration is invalid. Contact the owner.");
  return value.data;
}
export async function saveGlobalConfig(input: GlobalStoreConfig) {
  return db.transaction(async tx => {
    await tx.execute(sql`INSERT INTO site_settings(key,value) VALUES(${KEY},${JSON.stringify(defaultGlobalConfig())}) ON CONFLICT(key) DO NOTHING`);
    const current = JSON.parse(rows(await tx.execute(sql`SELECT value FROM site_settings WHERE key=${KEY} FOR UPDATE`))[0].value);
    if (current.revision !== input.revision) return null;
    const config = { ...input, revision: current.revision + 1, countries: input.countries.map(c => ({
      ...c, name: STORE_COUNTRIES.find(item => item.code === c.code)!.name,
      currency: c.code === "AE" ? "AED" : c.currency,
    })) };
    await tx.execute(sql`UPDATE site_settings SET value=${JSON.stringify(config)} WHERE key=${KEY}`);
    return config;
  });
}
export function availableCountries(config: GlobalStoreConfig) {
  return config.enabled ? config.countries.filter(c => c.enabled) :
    [{...STORE_COUNTRIES.find(c => c.code === "AE")!,enabled:true}];
}
export function eligibleMethods(config: GlobalStoreConfig, code: string) {
  const providers = providerStatus();
  return config.paymentMethods.filter(m => m.enabled && (m.provider !== "cod" || code === "AE") &&
    (!m.countries.length || m.countries.includes(code))).map(m => ({...m,configured:providers[m.provider]}));
}
export async function globalContext(selected?: string) {
  const config = await getGlobalConfig();
  const countries = availableCountries(config);
  const country = countries.find(c => c.code === selected) ?? countries.find(c => c.code === "AE") ?? countries[0];
  // With zero enabled countries the selector remains truthful; checkout is blocked.
  const chosen = country ?? {...STORE_COUNTRIES.find(c => c.code === "AE")!,enabled:false};
  return {enabled:config.enabled,country:chosen,countries,
    paymentMethods:country?eligibleMethods(config,chosen.code):[],
    fx:await displayExchangeRates(chosen.currency),settlementCurrency:"AED" as const};
}
export async function validateCheckoutCountry(code: string, provider: "cod"|"ziina", methodId?: string, selectedCode?: string) {
  const config = await getGlobalConfig();
  const allowed = availableCountries(config);
  // A removed country/global-off state must not strand an old session in an unusable checkout.
  const selected = allowed.find(c => c.code === selectedCode);
  if (selected && selected.code !== code) throw new Error("Your country selection changed. Review your checkout before ordering.");
  const country = allowed.find(c => c.code === code);
  if (!country) throw new Error("Delivery is not available in this country.");
  if (provider === "cod" && code !== "AE") throw new Error("Cash on delivery is available only in the UAE.");
  const method = eligibleMethods(config,code).find(m => m.provider === provider && (!methodId || m.id === methodId));
  if (!method) throw new Error("This payment method is not available for your country.");
  return country;
}
