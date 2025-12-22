import { createX402PaywalledRouter } from "../middleware/x402";
import { env } from "../lib/env";
import { getConcerts } from "../controllers/concert.controller";
import express from "express";

// TODO: Uncomment this when we have a working x402 paywall
// const router = createX402PaywalledRouter({
//     network: env.X402_NETWORK,
//     payTo: env.X402_PAY_TO,
//     routes: {
//         "/get-concerts": {
//             description: "Get all concerts",
//             mimeType: "application/json",
//             accepts: [{
//                 scheme: env.X402_SCHEME,
//                 payTo: env.X402_PAY_TO,
//                 price: env.X402_PRICE,
//                 network:  env.X402_NETWORK,
//             }]
            
//         },
//     },
// });

const router = express.Router(); // temp router 

router.get("/", getConcerts);
export default router;