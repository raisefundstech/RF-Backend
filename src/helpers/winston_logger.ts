"use strict";
import winston from "winston";
import config from "config";
import moment from "moment-timezone";
const timeFormat = moment().format("DD-MM-YYYY hh:mm:ss A");
const colorizer = winston.format.colorize();
const Winston: any = config.get("Winston");
const timeZone: any = config.get("timeZone");
let logColor: any = {
    colors: {
      error: "red",
      warn: "magenta",
      info: "yellow",
      http: "green",
      debug: "cyan",
    },
  },
  name: String = "Raise_Fund";
winston.addColors(logColor);

let alignColorsAndTime = winston.format.combine(
  winston.format.colorize({
    all: true,
  }),
  winston.format.timestamp({
    format: timeFormat,
  }),
  winston.format.json(),
  winston.format.printf(
    (info) =>
      `\x1b[96m[${name}]` +
      " " +
      `\x1b[95m${moment.tz(timeZone)}` +
      " " +
      colorizer.colorize(winston.level, `- ${info.level}: ${info.message}`)
  )
);

let fileLogger = winston.format.combine(
  winston.format.timestamp({
    format: timeFormat,
  }),
  winston.format.json(),
  winston.format.printf(
    (info) => `${info.timestamp}  ${info.level} : ${info.message}`
  )
);

/**
 * Winston logger instance.
 */
export const logger = winston.createLogger({
  level: Winston.level,
  transports: [
    new winston.transports.Http({
      level: "warn",
      format: winston.format.json(),
    }),
    new winston.transports.Console({
      format: alignColorsAndTime,
    }),
  ],
});

/**
 * Extracts information from the request object and logs it using Winston logger.
 * @param req - The request object.
 * @returns A Promise that resolves when the logging is complete.
 */
export const reqInfo = async function (req) {
  let splitResult = req
    .header("user-agent")
    ?.split("(")
    ?.toString()
    ?.split(")");
  let browserName = splitResult?.[splitResult?.length - 1];
  splitResult = splitResult?.[0]?.split(",");
  let osName = splitResult?.[1];
  logger.http(
    `${req.method} ${req.headers.host}${req.originalUrl} \x1b[33m device os => [${osName}] \x1b[1m\x1b[37mip address => ${req.ip} \n\x1b[36m browser => ${browserName}`
  );
};
