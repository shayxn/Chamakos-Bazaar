import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import storeRouter from "./store";
import uploadsRouter from "./uploads";
import paymentsRouter from "./payments";
import contentRouter from "./content";
import settingsRouter from "./settings";
import reviewsRouter from "./reviews";
import tiktokRouter from "./tiktok";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(storeRouter);
router.use(uploadsRouter);
router.use(paymentsRouter);
router.use(contentRouter);
router.use(settingsRouter);
router.use(reviewsRouter);
router.use(tiktokRouter);
router.use(importRouter);

export default router;
