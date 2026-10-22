import { randomInt } from 'node:crypto';
import { appName, smtpenable, updateMailCount } from '../../Utils.js';
import { logger } from '../../utils/logger.js';

// A 4-digit code with no rate limit is brute-forceable, so the send is throttled
// and the verification attempts are capped.
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
async function getDocument(docId) {
  try {
    const query = new Parse.Query('contracts_Document');
    query.equalTo('objectId', docId);
    query.include('ExtUserPtr');
    query.include('CreatedBy');
    query.include('Signers');
    query.include('AuditTrail.UserPtr');
    query.include('ExtUserPtr.TenantId');
    query.include('Placeholders');
    query.notEqualTo('IsArchive', true);
    const res = await query.first({ useMasterKey: true });
    const _res = res?.toJSON();
    return _res?.ExtUserPtr?.objectId;
  } catch (err) {
    logger.info('err ', err);
  }
}
async function sendMailOTPv1(request) {
  try {
    // Cryptographically secure and unbiased.
    let code = randomInt(1000, 10000);
    let email = request.params.email;
    let TenantId = request.params.TenantId ? request.params.TenantId : undefined;
    const AppName = appName;

    if (email) {
      const existingOtpQuery = new Parse.Query('defaultdata_Otp');
      existingOtpQuery.equalTo('Email', email);
      const existingOtp = await existingOtpQuery.first({ useMasterKey: true });
      const lastSentAt = existingOtp?.get('UpdatedAt') || existingOtp?.get('createdAt');
      if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < OTP_COOLDOWN_MS) {
        // Do not let the endpoint be used to flood a mailbox.
        return 'Please wait before requesting a new code';
      }
      const recipient = request.params.email;
      const mailsender = smtpenable ? process.env.SMTP_USER_EMAIL : process.env.MAILGUN_SENDER;
      try {
        await Parse.Cloud.sendEmail({
          sender: AppName + ' <' + mailsender + '>',
          recipient: recipient,
          subject: `Your ${AppName} OTP`,
          text: 'otp email',
          html:
            `<html><head><meta http-equiv='Content-Type' content='text/html;charset=UTF-8' /></head><body><div style='background-color:#f5f5f5;padding:20px'><div style='background-color:white;'><div style='background-color:red;padding:2px;font-family:system-ui;background-color:#47a3ad;'><p style='font-size:20px;font-weight:400;color:white;padding-left:20px;'>OTP Verification</p></div><div style='padding:20px;'><p style='font-family:system-ui;font-size:14px;'>Your OTP for ${AppName} verification is:</p><p style='text-decoration:none;font-weight:bolder;color:blue;font-size:45px;margin:20px;'>` +
            code +
            '</p></div></div></div></body></html>',
        });
        logger.info('OTP sent');
        if (request.params?.docId) {
          const extUserId = await getDocument(request.params?.docId);
          if (extUserId) {
            updateMailCount(extUserId);
          }
        }
      } catch (err) {
        logger.info('error in send OTP mail', err);
      }
      const tempOtp = new Parse.Query('defaultdata_Otp');
      tempOtp.equalTo('Email', email);
      const resultOTP = await tempOtp.first({ useMasterKey: true });
      if (resultOTP !== undefined) {
        const updateOtpQuery = new Parse.Query('defaultdata_Otp');
        const updateOtp = await updateOtpQuery.get(resultOTP.id, {
          useMasterKey: true,
        });
        updateOtp.set('OTP', code);
        updateOtp.set('Attempts', 0);
        updateOtp.set('ExpiresAt', new Date(Date.now() + OTP_TTL_MS));
        updateOtp.save(null, { useMasterKey: true });
      } else {
        const otpClass = Parse.Object.extend('defaultdata_Otp');
        const newOtpQuery = new otpClass();
        newOtpQuery.set('OTP', code);
        newOtpQuery.set('Email', email);
        newOtpQuery.set('TenantId', TenantId);
        newOtpQuery.set('Attempts', 0);
        newOtpQuery.set('ExpiresAt', new Date(Date.now() + OTP_TTL_MS));
        await newOtpQuery.save(null, { useMasterKey: true });
      }
      return 'Otp send';
    } else {
      return 'Please Enter valid email';
    }
  } catch (err) {
    logger.info('err in sendMailOTPv1');
    logger.info(err);
    return err;
  }
}
export default sendMailOTPv1;
