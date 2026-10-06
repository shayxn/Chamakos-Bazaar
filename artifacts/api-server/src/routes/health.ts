import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const revision = process.env.RENDER_GIT_COMMIT;
  if (revision && /^[a-f0-9]{7,40}$/i.test(revision)) {
    res.setHeader("X-Imaginate-Revision", revision.slice(0, 12));
  }
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
