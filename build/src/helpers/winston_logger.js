"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reqInfo = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = __importDefault(require("config"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const timeFormat = (0, moment_timezone_1.default)().format('DD-MM-YYYY hh:mm:ss A');
const colorizer = winston_1.default.format.colorize();
const Winston = config_1.default.get('Winston');
const timeZone = config_1.default.get('timeZone');
let logColor = {
    colors: {
        error: "red",
        warn: "magenta",
        info: "yellow",
        http: "green",
        debug: "cyan"
    }
}, name = "Raise_Fund";
winston_1.default.addColors(logColor);
let alignColorsAndTime = winston_1.default.format.combine(winston_1.default.format.colorize({
    all: true
}), winston_1.default.format.timestamp({
    format: timeFormat
}), winston_1.default.format.json(), winston_1.default.format.printf(info => `\x1b[96m[${name}]` + " " + `\x1b[95m${moment_timezone_1.default.tz(timeZone)}` + " " + colorizer.colorize(winston_1.default.level, `- ${info.level}: ${info.message}`)));
let fileLogger = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: timeFormat
}), winston_1.default.format.json(), winston_1.default.format.printf(info => `${info.timestamp}  ${info.level} : ${info.message}`));
exports.logger = winston_1.default.createLogger({
    level: Winston.level,
    transports: [
        new winston_1.default.transports.Http({
            level: 'warn',
            format: winston_1.default.format.json()
        }),
        new (winston_1.default.transports.Console)({
            format: alignColorsAndTime,
        })
    ],
});
const reqInfo = async function (req) {
    let splitResult = req.header('user-agent')?.split("(")?.toString()?.split(")");
    let browserName = splitResult?.[splitResult?.length - 1];
    splitResult = splitResult?.[0]?.split(",");
    let osName = splitResult?.[1];
    exports.logger.http(`${req.method} ${req.headers.host}${req.originalUrl} \x1b[33m device os => [${osName}] \x1b[1m\x1b[37mip address => ${req.ip} \n\x1b[36m browser => ${browserName}`);
};
exports.reqInfo = reqInfo;
//# sourceMappingURL=winston_logger.js.map