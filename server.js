/**
 * QuirófanoHH — Servidor para Railway.app
 * Hospital Humanitario · Cuenca, Ecuador
 */
require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: '*' }));

// ── Servir el frontend ──
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Gmail transporter ──
function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

// ── Health check ──
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    service: 'QuirófanoHH',
    hospital: 'Hospital Humanitario · Cuenca, Ecuador',
    gmail: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
    version: '1.0.0'
  });
});

// ── Test Gmail ──
app.post('/api/email/test', async (req, res) => {
  const t = getTransporter();
  if (!t) return res.status(400).json({ ok: false, error: 'Gmail no configurado' });
  try {
    await t.verify();
    res.json({ ok: true, message: 'Conexión Gmail verificada', user: process.env.GMAIL_USER });
  } catch(e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ── Enviar correo de notificación ──
app.post('/api/email/send', async (req, res) => {
  const { to, subject, body, tipo } = req.body;
  if (!to || !subject) return res.status(400).json({ ok: false, error: 'Faltan datos' });
  const t = getTransporter();
  if (!t) return res.status(400).json({ ok: false, error: 'Gmail no configurado en el servidor' });
  try {
    const html = buildEmailHTML(tipo || 'notificacion', subject, body);
    const info = await t.sendMail({
      from: `"${process.env.GMAIL_FROM_NAME || 'QuirófanoHH Hospital Humanitario'}" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html
    });
    res.json({ ok: true, messageId: info.messageId });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Template HTML de correo profesional ──
function buildEmailHTML(tipo, subject, body) {
  const colors = {
    agendamiento:  { bg: '#1A5FB4', icon: '🗓️' },
    emergencia:    { bg: '#CC0000', icon: '🔴' },
    aprobacion:    { bg: '#1A7A5E', icon: '✅' },
    rechazo:       { bg: '#B42020', icon: '❌' },
    cancelacion:   { bg: '#9A6200', icon: '⚠️' },
    reprogramacion:{ bg: '#5B3FA6', icon: '📅' },
    completada:    { bg: '#2E7A3C', icon: '✅' },
    disponibilidad:{ bg: '#1A7A5E', icon: '🏥' },
    notificacion:  { bg: '#1A5FB4', icon: 'ℹ️' },
  };
  const cfg = colors[tipo] || colors.notificacion;
  const bodyHtml = body ? body.replace(/\n/g,'<br>').replace(/━+/g,'<hr style="border:1px solid #E0E0E0">') : '';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F2F1EC;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F1EC;padding:30px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
  <tr><td style="background:${cfg.bg};padding:28px 32px;">
    <div style="font-size:13px;color:rgba(255,255,255,.7);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Hospital Humanitario · Cuenca, Ecuador</div>
    <div style="font-size:20px;font-weight:700;color:#fff">${cfg.icon} ${subject}</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-size:14px;color:#333;line-height:1.7">${bodyHtml}</td></tr>
  <tr><td style="background:#F2F1EC;padding:18px 32px;text-align:center;font-size:12px;color:#999">
    Sistema de Gestión Quirúrgica — Hospital Humanitario<br>
    Cuenca, Ecuador · Mensaje automático, no responder.
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── Iniciar servidor ──
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   QuirófanoHH — Hospital Humanitario Cuenca      ║');
  console.log(`  ║   Servidor corriendo en puerto ${PORT}               ║`);
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Gmail: ${process.env.GMAIL_USER || '⚠  No configurado'}`);
  console.log('');
});
