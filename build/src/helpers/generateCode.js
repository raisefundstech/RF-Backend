"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVolunteerCode = void 0;
const generateVolunteerCode = () => {
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
};
exports.generateVolunteerCode = generateVolunteerCode;
//# sourceMappingURL=generateCode.js.map