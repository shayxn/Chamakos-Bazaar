import { Router } from "express";
import { requireOwner } from "../lib/admin-permissions";
import { availableCountries, getGlobalConfig, globalConfigSchema, globalContext, providerStatus, saveGlobalConfig, selectedStoreCountry } from "../lib/global-store";
import { STORE_COUNTRIES } from "../lib/store-countries";

const router = Router();
router.get("/storefront/global", async (req, res) => {
  const context = await globalContext(selectedStoreCountry(req));
  res.setHeader("Cache-Control","no-store");
  res.json(context);
});
router.post("/storefront/country", async (req, res) => {
  const code = String(req.body.code ?? "").toUpperCase();
  if (!availableCountries(await getGlobalConfig()).some(c => c.code === code)) {
    res.status(400).json({error:"This country is no longer available."});return;
  }
  // Keep preferences out of the signed auth/cart cookie: a slow FX response must not overwrite a newer guest order/access grant.
  const context = await globalContext(code);
  res.cookie("imaginate_country",context.country.code,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:30*86_400_000});
  res.setHeader("Cache-Control","no-store");
  res.json(context);
});
router.get("/admin/global-store", requireOwner, async (_req,res) => {
  res.setHeader("Cache-Control","no-store");
  res.json({config:await getGlobalConfig(),providers:providerStatus(),countryCatalog:STORE_COUNTRIES});
});
router.put("/admin/global-store", requireOwner, async (req,res) => {
  const parsed = globalConfigSchema.safeParse(req.body);
  if (!parsed.success) {res.status(400).json({error:parsed.error.issues[0]?.message ?? "Invalid settings."});return;}
  const config = await saveGlobalConfig(parsed.data);
  if (!config) {res.status(409).json({error:"Settings changed in another session. Reload before saving."});return;}
  res.json({config,providers:providerStatus(),countryCatalog:STORE_COUNTRIES});
});
export default router;
