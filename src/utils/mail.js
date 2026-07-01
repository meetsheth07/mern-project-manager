import mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
    const mailGenerator = new mailgen({
        theme: "default",
        product: {
            name: "Task Manager",
            link: "https://taskmanagelink.com",
        }
    })
    const emailTexttual= mailGenerator.generatePlaintext(options.mailgenContent);
    const emailHTML = mailGenerator.generate(options.mailgenContent);
    const transporter = nodemailer.createTransport({
        host : process.env.MAILTRAP_SMTP_HOST,
        port : process.env.MAILTRAP_SMTP_PORT,
        auth : {
            user : process.env.MAILTRAP_SMTP_USERNAME,
            pass : process.env.MAILTRAP_SMTP_PASSWORD
        }
    })
    const mail = {
        from : "mail.taskmanager@example.com",
        to : options.email,
        subject : options.subject,
        text : emailTexttual,
        html : emailHTML

    }
    try{
        await transporter.sendMail(mail);
    } catch (error) {
        console.error("Error sending email:", error);
        
    }

}
const emailVerificationmailGenContent = (username, verificationUrl)=> {
    return {
        body:{
            name: username,
            intro: "Welcome to our application! We're excited to have you on board.",
            action:{
                instructions: "To get started, please verify your email address by clicking the button below:",
                button:{
                    color: "#22BC66", // Optional action button color
                    text: "Verify Email",
                    link : verificationUrl
                },
            },
            outro: "If you need any assistance, feel free to reach out to our support team. We're here to help!"
        },
    }
}

const resetPasswordMailGenContent = (username, resetUrl)=> {
    return {
        body:{
            name: username,
            intro: "You have requested to reset your password.",
            action:{
                instructions: "To get started, please click the button below:",
                button:{
                    color: "#22BC66", // Optional action button color
                    text: "Reset Password",
                    link : resetUrl
                },
            },
            outro: "If you need any assistance, feel free to reach out to our support team. We're here to help!"
        },
    }
}

export{emailVerificationmailGenContent, resetPasswordMailGenContent, sendEmail};