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

export const generateOTP = () => {
    const timestamp = Math.floor(Date.now() / 1000); // Get current Linux epoch timestamp
    const lastSixDigits = timestamp.toString().slice(-6); // Get last 6 digits
    const otp = parseInt(lastSixDigits); // Convert to integer
    return otp;
}