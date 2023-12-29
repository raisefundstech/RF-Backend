export const generateVolunteerCode = () => {
    let result = '';
    const number = Math.floor(1000 + Math.random() * 9999);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 4) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    const finalResult = "RF-" + result + number;
    return finalResult;
}

// Genrates a random 6-digit OTP
export const generateOTP = () => {
    const timestamp = Math.floor(Date.now() / 1000); // Get current Linux epoch timestamp
    const lastSixDigits = timestamp.toString().slice(-6); // Get last 6 digits
    let otp = parseInt(lastSixDigits); // Convert to integer
    // If the last 6 digits are less than 6 digits, add random digits to the end
    if (otp.toString().length < 6) {
        const randomDigits = Math.floor(100000 + Math.random() * 900000); // Generate random 6-digit number
        otp = parseInt(otp.toString() + randomDigits.toString().slice(0, 6 - otp.toString().length));
    }
    return otp;
}