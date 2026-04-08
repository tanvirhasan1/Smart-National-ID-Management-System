const createTransporter = require('./mailTransport');

const sendOneTimeCodeEmail = async ({
  email,
  fullName,
  code,
  subject,
  title,
  expiresInMinutes = 1,
  intro,
  outro
}) => {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">${title}</h2>
      <p>প্রিয় ${fullName || 'ব্যবহারকারী'},</p>
      <p>${intro}</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 16px 0; color: #16A34A;">
        ${code}
      </div>
      <p>এই কোড ${expiresInMinutes} মিনিট পর্যন্ত বৈধ থাকবে।</p>
      <p>${outro}</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Smart NID" <${process.env.MAIL_USER}>`,
    to: email,
    subject,
    html
  });
};

module.exports = sendOneTimeCodeEmail;