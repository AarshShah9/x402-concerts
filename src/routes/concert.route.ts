import { createX402PaywalledRouter } from "../middleware/x402";
import { env } from "../lib/env";
import { getConcerts, test } from "../controllers/concert.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = createX402PaywalledRouter({
  network: env.X402_NETWORK,
  payTo: env.X402_PAY_TO,
  routes: {
    "/": {
      description: "Get all concerts",
      mimeType: "application/json",
      accepts: [
        {
          scheme: env.X402_SCHEME,
          payTo: env.X402_PAY_TO,
          price: env.X402_PRICE,
          network: env.X402_NETWORK,
        },
      ],
    },
    "/test": {
      description: "Test route",
      mimeType: "application/json",
      accepts: [
        {
          scheme: env.X402_SCHEME,
          payTo: env.X402_PAY_TO,
          price: env.X402_PRICE,
          network: env.X402_NETWORK,
        },
      ],
    },
  },
});

router.get("/", asyncHandler(getConcerts));
router.get("/test", asyncHandler(test));
export default router;
