import nodemailer from 'nodemailer';

/**
 * Verifies if the SMTP server is reachable and credentials are correct.
 * @param {Object} config - SMTP configuration object
 * @returns {Promise<Object>} Verification result
 */
export async function verifyConnection(config) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure === 1, // true for port 465, false for other ports
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 5000, // 5 seconds timeout
      greetingTimeout: 5000,
    });

    await transporter.verify();
    return { success: true };
  } catch (err) {
    console.error('SMTP Verification failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a test email using the configured SMTP server.
 * @param {Object} config - SMTP configuration object
 * @param {string} recipient - Target email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (text or html)
 * @returns {Promise<Object>} Send result
 */
export async function sendTestEmail(config, recipient, subject, body) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure === 1,
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 8000,
    });

    const info = await transporter.sendMail({
      from: `"${config.name || 'SMTP Client'}" <${config.username}>`,
      to: recipient,
      subject: subject || 'SMTP Server Test Connection',
      text: body || 'Hello from your SMTP Connection Manager! This is a test email sent to verify your SMTP configuration.',
      html: body ? undefined : `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
        <h2 style="color: #2563eb; margin-top: 0;">SMTP Test Connection Successful!</h2>
        <p>This message was sent using your SMTP credentials configured on the <strong>SMTP Connection & Client Manager</strong> panel.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <div style="font-size: 0.85rem; color: #64748b;">
          <div><strong>SMTP Server:</strong> ${config.host}:${config.port}</div>
          <div><strong>Auth Username:</strong> ${config.username}</div>
          <div><strong>Sent At:</strong> ${new Date().toLocaleString()}</div>
        </div>
      </div>`
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('SMTP Send failed:', err.message);
    return { success: false, error: err.message };
  }
}
