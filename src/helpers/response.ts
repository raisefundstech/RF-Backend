export const responseMessage = {
  loginSuccess: "Login Successful!",
  signupSuccess: "Registration Successful!",
  internalServerError: "Internal Server Error!",
  alreadyEmail: "Email is already registered!",
  alreadyMobileNumber: "Mobile number is already registered!",
  emailUnverified: "Your email is unverified!",
  accountBlock: "Your account has been blocked!",
  invalidUserPasswordEmail: "You have entered an invalid username or password!",
  invalidOTP: "Invalid OTP!",
  invalidPassword: "Invalid password!",
  invalidMobileNumber: "Invalid mobile number!",
  expireOTP: "OTP has been expired!",
  OTPverified: "OTP has been verified successfully!",
  sendOTP: "OTP has been sent successfully!",
  emailVerified: "Your email address has been verified!",
  invalidEmail: "You have entered an invalid email!",
  invalidIdTokenAndAccessToken:
    "You have entered an invalid idToken or accessToken!",
  errorMail: "Error in mail system!",
  resetPasswordSuccess: "Your password has been successfully reset!",
  resetPasswordError: "Error in reset password!",
  oldPasswordError: "You have entered the old password wrong!",
  passwordChangeSuccess: "Password has been changed!",
  passwordChangeError: "During password changing error in database!",
  invalidOldTokenReFreshToken:
    "You have entered an invalid old token or refresh token!",
  refreshTokenNotFound: "Refresh token not found!",
  refreshTokenSuccess: "A new token has been successfully generated!",
  differentToken: "Do not try a different token!",
  tokenNotFound: "We can't find Authorization token in the header!",
  logout: "Logout Successful!",
  fileUploadSuccess: "Your requested file uploaded successfully!",
  addDataError: "Oops! Something went wrong!",
  addStoreSuccess:
    "Thanks for your submission. We have received it and will review in 2-3 days!",
  accessDenied: "Access Denied!",
  invalidToken: "Invalid Authorization Token !",
  invalidBodyFields: "Invalid body fields combination!",
  unavailableCategory: "Category unavailable!",
  reviewAlready: "Your review already exists in the store review list!",
  storeOwnerReviewError: "You can't review in your store!",
  allUserSentEmail: "Email has been sent to all user successful!",
  appleAccountError:
    "Your account has been deleted,Please remove account from Setting > Your account > Password & Security > Apps using Apple ID > Finder: Find your partner > Click to stop using Apple ID",
  logoutSuccess: "You have been logged out successfully",
  logoutDevices: "You have been logged out from other devices",
  deniedPermission: "You have denied permission",
  invalidId: (message: string): any => {
    return `Invalid ${message}!`;
  },
  customMessage: (message: string): any => {
    return `${message}!`;
  },
  likeSuccess: (message: string): any => {
    return `${message} liked successfully!`;
  },
  dislikeSuccess: (message: string): any => {
    return `${message} disliked successfully!`;
  },
  dataAlreadyExist: (message: any): any => {
    return `${
      message[0].toUpperCase() + message.slice(1).toLowerCase()
    } already exists!`;
  },
  getDataSuccess: (message: string): any => {
    return `${
      message[0].toUpperCase() + message.slice(1).toLowerCase()
    } successfully retrieved!`;
  },
  addDataSuccess: (message: string): any => {
    return `${
      message[0].toUpperCase() + message.slice(1).toLowerCase()
    } successfully added!`;
  },
  getDataNotFound: (message: string): any => {
    return `We couldn't find the ${message.toLowerCase()} you requested!`;
  },
  updateDataSuccess: (message: string): any => {
    return `${
      message[0].toUpperCase() + message.slice(1).toLowerCase()
    } has been successfully updated!`;
  },
  updateDataError: (message: string): any => {
    return `${
      message[0].toUpperCase() + message.slice(1).toLowerCase()
    } updating time getting an error!`;
  },
  deleteDataSuccess: (message: string): any => {
    return `Your ${message.toLowerCase()} has been successfully deleted!`;
  },
  logoutFailure: (message: string): any => {
    return `Unable to find the ${message.toUpperCase()} login information!`;
  },
};
