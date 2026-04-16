const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
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
    // Try req.body first (Vercel auto-parsed)
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString('utf-8'));
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      body = JSON.parse(req.body);
    } else {
      // Fallback: read raw stream
      const raw = await getRawBody(req);
      body = JSON.parse(raw);
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON', detail: err.message });
  }

  const { name, email, subject, message } = body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      error: 'All fields are required',
      received: body,
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
