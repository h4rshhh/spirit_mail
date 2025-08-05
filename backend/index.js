import express, { json } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

config();

const app = express();
app.use(cors());
app.use(json());
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-xxxx',
});

app.post('/api/generate-email', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an assistant that writes professional, concise emails.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 512,
    });

    const email = completion.choices[0]?.message?.content || '';
    res.json({ email });
  } catch (error) {
    console.error('Error generating email:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

// Configure mail transporter (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'false' ? false : true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/api/send-email', async (req, res) => {
  const { recipients, subject = 'AI Generated Email', content } = req.body;

  if (!recipients || !content) {
    return res.status(400).json({ error: 'Recipients and content are required' });
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: recipients,
      subject,
      html: content,
      text: content.replace(/<[^>]+>/g, ''),
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Serve static frontend
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});