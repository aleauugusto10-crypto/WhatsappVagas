import { Router } from "express";
import * as controller from "./controller.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Leads
|--------------------------------------------------------------------------
*/

router.get("/", controller.list);

router.post("/", controller.create);

/*
|--------------------------------------------------------------------------
| Conversations
|--------------------------------------------------------------------------
*/

router.post(
  "/:leadId/conversations",
  controller.createConversation
);

router.post(
  "/conversations/:conversationId/messages",
  controller.createMessage
);

router.get(
  "/conversations/:conversationId/messages",
  controller.getMessages
);

router.post(
  "/conversations/:conversationId/reply",
  controller.continueConversation
);

/*
|--------------------------------------------------------------------------
| Human takeover
|--------------------------------------------------------------------------
*/

router.post(
  "/:leadId/assume",
  controller.assumeConversation
);

/*
|--------------------------------------------------------------------------
| Prospection
|--------------------------------------------------------------------------
*/

router.post(
  "/:leadId/start-prospection",
  controller.startProspection
);

router.get(
  "/prospection/queue",
  controller.getProspectionQueue
);

router.post(
  "/prospection/start",
  controller.startQueueProspection
);

/*
|--------------------------------------------------------------------------
| AI Test
|--------------------------------------------------------------------------
*/

router.post("/ai/test", async (req, res) => {
  try {
    const { generateAIResponse } = await import(
      "./ai.service.js"
    );

    const response = await generateAIResponse([
      {
        role: "user",
        content: req.body.message,
      },
    ]);

    res.json({
      response,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| First Contact AI
|--------------------------------------------------------------------------
*/

router.post("/ai/first-contact", async (req, res) => {
  try {
    const { generateFirstContact } = await import(
      "./ai.service.js"
    );

    const response =
      await generateFirstContact(req.body);

    res.json({
      response,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});
/*
|--------------------------------------------------------------------------
| Generate Payment
|--------------------------------------------------------------------------
*/

router.post(
  "/:leadId/generate-payment",
  controller.generateLeadPayment
);


/*
|--------------------------------------------------------------------------
| Inbound Hot Lead - Quero minha vitrine
|--------------------------------------------------------------------------
*/

router.post(
  "/inbound/showcase",
  controller.startInboundShowcaseFlow
);
export default router;