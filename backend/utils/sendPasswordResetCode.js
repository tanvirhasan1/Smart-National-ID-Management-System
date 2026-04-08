const sendOneTimeCodeEmail = require('./sendOneTimeCodeEmail');

const sendPasswordResetCode = async ({ email, fullName, code }) => {
  return sendOneTimeCodeEmail({
    email,
    fullName,
    code,
    subject: 'তোমার পাসওয়ার্ড রিসেট কোড',
    title: 'পাসওয়ার্ড রিসেট কোড',
    intro: 'তোমার Smart NID পাসওয়ার্ড রিসেট করার জন্য নিচের কোডটি ব্যবহার করো।',
    outro: 'তুমি যদি পাসওয়ার্ড রিসেট অনুরোধ না করে থাকো, তাহলে দ্রুত সাপোর্ট টিমের সাথে যোগাযোগ করো।',
    expiresInMinutes: 10
  });
};

module.exports = sendPasswordResetCode;