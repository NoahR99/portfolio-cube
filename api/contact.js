const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function parseBody(req) {
  const raw = req.body;

  // Already an object with expected fields
  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw) && raw.name) {
    return raw;
  }

  // Buffer → string → object
  if (Buffer.isBuffer(raw)) {
    return JSON.parse(raw.toString('utf-8'));
  }

  // String → object
  if (typeof raw === 'string') {
    return JSON.parse(raw);
  }

  // Vercel sometimes nests the parsed body
  if (raw && typeof raw === 'object') {
    return raw;
  }

  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = parseBody(req);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON', detail: err.message });
  }

  if (!body) {
    return res.status(400).json({ error: 'Empty body', bodyType: typeof req.body });
  }

  const { name, email, subject, message } = body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      error: 'All fields are required',
      received: Object.keys(body),
    });
  }

  try {
    await resend.emails.send({
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: 'noahrobisone@gmail.com',
      subject: `${subject} — from ${name}`,
      replyTo: email,
      text: `From: ${name} (${email})\n\n${message}`,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};
