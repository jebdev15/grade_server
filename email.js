const nodemailer = require("nodemailer");
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "new-cgs@chmsu.edu.ph",
    pass: "konbcfffebkuvszm",
  },
});

const main = async () => {
  const emailInfo = await transport.sendMail({
    from: "donotreply@chmsu.edu.ph",
    to: "almark.duma-op@chmsu.edu.ph",
    subject: "Test Email",
    text: "Test Email Text",
    html: "<b>HTML Content</b>",
  });

  console.log(`messageId: ${emailInfo.messageId}`);
};

main().catch(console.error);
