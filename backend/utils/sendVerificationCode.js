const sendOneTimeCodeEmail = require('./sendOneTimeCodeEmail');

const sendVerificationCode = async ({ email, fullName, code }) => {
  return sendOneTimeCodeEmail({
    email,
    fullName,
    code,
    subject: 'তোমার অ্যাকাউন্ট যাচাইকরণ কোড',
    title: 'ইমেইল যাচাইকরণ কোড',
    intro: 'তোমার Smart NID অ্যাকাউন্ট যাচাই করার জন্য নিচের কোডটি ব্যবহার করো।',
    outro: 'তুমি যদি এই অনুরোধ না করে থাকো, তাহলে এই ইমেইল উপেক্ষা করো।',
    expiresInMinutes: 1
  });
};

module.exports = sendVerificationCode;