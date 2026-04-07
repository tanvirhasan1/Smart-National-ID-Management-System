const createTransporter = require('./mailTransport');

const sendVerificationCode = async ({ email, fullName, code }) => {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>ইমেইল যাচাইকরণ কোড</h2>
      <p>প্রিয় ${fullName || 'ব্যবহারকারী'},</p>
      <p>তোমার যাচাইকরণ কোড হলো:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
        ${code}
      </div>
      <p>এই কোড ১ মিনিট পর্যন্ত বৈধ থাকবে।</p>
      <p>তুমি যদি এই অনুরোধ না করে থাকো, তাহলে এই ইমেইল উপেক্ষা করো।</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Smart NID" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'তোমার যাচাইকরণ কোড',
    html
  });
};

module.exports = sendVerificationCode;