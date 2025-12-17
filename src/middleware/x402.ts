import express from "express";
import { Network, paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient, RoutesConfig } from "@x402/core/server";
import { env } from "../lib/env";

export function createX402PaywalledRouter(opts: {
  network: Network;
  payTo: string;
  routes: RoutesConfig;
}) {
  const router = express.Router();

  const server = new x402ResourceServer(
    new HTTPFacilitatorClient({ url: env.X402_FACILITATOR_URL }),
  ).register(opts.network, new ExactEvmScheme());

  router.use(
    paymentMiddleware(
      opts.routes,
      server,
    ),
  );

  return router;
}
