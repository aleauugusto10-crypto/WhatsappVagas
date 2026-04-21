
import express from 'express';
import dotenv from 'dotenv';
import { handleMessage } from './src/bot.js';

dotenv.config();

const app = express();
app.use(express.json());

import { handleMessage } from "./src/bot.js";

app.post('/webhook', async (req, res) => {
  try {
    console.log("📩 mensagem recebida:", JSON.stringify(req.body, null, 2));

    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if(msg){
      console.log("🔥 chamando handleMessage");
      await handleMessage(msg);
    } else {
      console.log("⚠️ nenhuma mensagem encontrada");
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ erro no webhook:", err);
    res.sendStatus(500);
  }
});

app.get('/webhook',(req,res)=>{
  if(req.query['hub.verify_token'] === process.env.VERIFY_TOKEN){
    return res.send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("running");
});
