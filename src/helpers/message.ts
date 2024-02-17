import config from "config";
import {
  PinpointClient,
  SendOTPMessageCommand,
  SendMessagesCommand,
  VerifyOTPMessageCommand,
  AddressConfiguration,
  MessageType,
} from "@aws-sdk/client-pinpoint";

const aws_config: any = config.get("aws");
const aws_pinpoint: any = config.get("awsPinpoint");

const pinpoint_config = {
  region: aws_config.region,
  credentials: {
    accessKeyId: aws_config.accessKeyId,
    secretAccessKey: aws_config.secretAccessKey,
  },
};

const client = new PinpointClient(pinpoint_config);

function generateReferenceId() {
  // Create a new Date object to represent the current date and time
  const currentTime = new Date();
  // Use the getTime() method to get the timestamp in milliseconds
  const timestampInMilliseconds = currentTime.getTime();
  // Convert to Unix timestamp in seconds (divide by 1000)
  const timestampInSeconds = Math.floor(timestampInMilliseconds / 1000);
  // return the timestamp as string
  return String(timestampInSeconds);
}

/**
 * Sends an SMS message to the specified receiver.
 * @param receiver_info - The information of the receiver, including the mobile number.
 * @returns A promise that resolves with the response from the SMS service.
 */
export async function sendSMS(receiver_info): Promise<any> {
  return new Promise(async (resolve, reject) => {
    var referenceId = generateReferenceId();
    try {
      const input = {
        // SendOTPMessageRequest
        ApplicationId: "d3fb72c2dfab496ba9565cf2d1c8770a", // required
        SendOTPMessageRequestParameters: {
          // SendOTPMessageRequestParameters
          AllowedAttempts: Number(5),
          BrandName: "Raise Funds",
          Channel: "SMS",
          CodeLength: Number(6),
          DestinationIdentity: receiver_info.mobileNumber,
          Language: "en-US",
          OriginationIdentity: aws_config.originNumber,
          ReferenceId: referenceId,
          ValidityPeriod: Number(30),
        },
      };
      const command = new SendOTPMessageCommand(input);
      const response = await client.send(command);
      const customResponse = {
        ...response,
        referenceId: referenceId,
      };
      resolve(customResponse);
    } catch (error) {
      console.error("Error sending email:", error);
      reject(error);
    }
  });
}

/**
 * Validates the OTP (One-Time Password) using the provided OTP information.
 * @param otp_info - The OTP information object.
 * @returns A promise that resolves with the response from the OTP verification.
 */
export async function validOTP(otp_info): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const input = {
        // VerifyOTPMessageRequest
        ApplicationId: otp_info.ApplicationId, // required
        VerifyOTPMessageRequestParameters: {
          // VerifyOTPMessageRequestParameters
          DestinationIdentity: otp_info.mobileNumber, // required
          Otp: otp_info.otp, // required
          ReferenceId: otp_info.referenceId, // required
        },
      };
      const command = new VerifyOTPMessageCommand(input);
      const response = await client.send(command);
      resolve(response);
    } catch (error) {
      console.error("Error sending otp:", error);
      reject(error);
    }
  });
}

/**
 * Sends a login SMS to the specified destination number.
 * @param destinationNumber - The phone number to send the SMS to.
 * @param message - The content of the SMS message.
 * @returns A promise that resolves to the result of sending the SMS.
 */
export async function sendLoginSMS(
  destinationNumber: string,
  message: string
): Promise<any> {
  const referenceId = generateReferenceId();

  const params = {
    ApplicationId: aws_pinpoint.applicationId, // Replace with your Pinpoint application ID
    MessageRequest: {
      Addresses: {
        [destinationNumber]: {
          ChannelType: "SMS",
        },
      } as Record<string, AddressConfiguration>,
      MessageConfiguration: {
        SMSMessage: {
          Body: message,
          MessageType: "PROMOTIONAL" as MessageType, // Change to 'TRANSACTIONAL' if needed
          OriginationNumber: aws_pinpoint.originNumber, // Replace with your Pinpoint origination number
        },
      },
      TraceId: referenceId,
    },
  };

  try {
    const command = new SendMessagesCommand(params);
    const result = await client.send(command);
    return result;
  } catch (error) {
    throw error;
  }
}
