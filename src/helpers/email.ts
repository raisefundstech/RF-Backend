import nodemailer from 'nodemailer';
import config from 'config'

export async function sendEmail(receiver,otp) : Promise<any> {
    return new Promise(async (resolve, reject) => {
        // Get the email configuration from the config file
        const emailConfig: any = config.get("nodeMail");
    
        // Create a transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
          service: emailConfig.service, // e.g., 'Gmail' for Gmail
          auth: {
            user: emailConfig.mail,
            pass: emailConfig.password,
          },
        });
    
        // Define email data
        const mailOptions = {
          from: emailConfig.mail,
          to: receiver,
          subject: 'RaiseFunds OTP',
          text: otp + ' is your OTP to log in to Raise funds. Code will expire in 5 minutes.',
        };
    
        try {
          // Send the email
          const info = await transporter.sendMail(mailOptions);
          console.log('Email sent:', info.response);
          resolve(info);
        } catch (error) {
          console.error('Error sending email:', error);
          reject(error);
        }
    });
}
