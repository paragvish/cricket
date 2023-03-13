const nodemailer = require('nodemailer');

module.exports.transporter = nodemailer.createTransport({
  service: process.env.NODEMAILER_SERVICE,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

module.exports.mailOptions = (to, subject, mailBody) => {
  const messageConfiguration = {
    from: 'Fancy Market <no-reply@codesfortomorrow.com>',
    to,
    subject,
    html: mailBody
  };

  return messageConfiguration;
};
