
import express from 'express';
import dotenv from 'dotenv';
import { handleMessage } from './src/bot.js';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  console.log("📩 mensagem recebida:", JSON.stringify(req.body, null, 2));

  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if(msg){
    await handleMessage(msg);
  }

  res.sendStatus(200);
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
