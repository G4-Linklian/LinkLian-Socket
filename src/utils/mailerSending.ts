import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInitialPasswordEmail = async (
  to: string,
  password: string
) => {

  await transporter.sendMail({
    from: `"LinkLian System" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your Initial Login Credentials for LinkLian",
    text: `
Dear LinkLian User,

Below are your initial login credentials for accessing the LinkLian system:

Email:
${to}

Initial Password:
${password}

Please use the above information to log in to the LinkLian system.
After logging in successfully, you are required to change your password immediately for security reasons.

If you did not request this account, please contact the system administrator.

Best regards,
LinkLian System
    `,
    html: `
      <p>Dear <strong>LinkLian User</strong>,</p>

      <p>Below are your initial login credentials for accessing the <strong>LinkLian</strong> system:</p>

      <p><strong>Email:</strong><br/>${to}</p>
      <p><strong>Initial Password:</strong><br/>${password}</p>

      <p>
        Please use the above information to log in to the LinkLian system.<br/>
        <strong>After logging in successfully, you are required to change your password immediately for security reasons.</strong>
      </p>

      <p>
        If you did not request this account, please contact the system administrator.
      </p>

      <p>
        Best regards,<br/>
        <strong>LinkLian System</strong>
      </p>
    `,
  });
};

export const sendOTPEmail = async (
  to: string,
  otp: string
) => {
  await transporter.sendMail({
    from: `"LinkLian Security" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your Login Verification Code (OTP)",
    text: `
Dear LinkLian User,

Your one-time verification code is:

${otp}

This code is valid for the current login session only.
If you did not attempt to log in, please ignore this email.
    `,
    html: `
      <p>Dear <strong>LinkLian User</strong>,</p>

      <p>Your one-time verification code is:</p>

      <h2 style="letter-spacing:2px;">${otp}</h2>

      <p>
        This code is valid for the current login session only.<br/>
        If you did not attempt to log in, please ignore this email.
      </p>

      <p>
        Regards,<br/>
        <strong>LinkLian Security</strong>
      </p>
    `,
  });
};