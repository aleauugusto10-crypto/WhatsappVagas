
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function sendMessage(to, text){
  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product:"whatsapp",
      to,
      text:{body:text}
    },
    {
      headers:{
        Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type":"application/json"
      }
    }
  );
}
