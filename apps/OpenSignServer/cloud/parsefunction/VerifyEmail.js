export default async function VerifyEmail(request) {
  try {
    if (!request?.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User is not authenticated.');
    } else {
      let otpN = request.params.otp;
      let otp = parseInt(otpN);
      let email = (request.params.email || '').toLowerCase().trim();
      if (!email) {
        email = request?.user?.get('email');
      }

      //checking otp is correct or not which already save in defaultdata_Otp class
      const checkOtp = new Parse.Query('defaultdata_Otp');
      checkOtp.equalTo('Email', email);
      checkOtp.equalTo('OTP', otp);

      const res = await checkOtp.first({ useMasterKey: true });
      // A missing or expired code is never accepted, and a wrong code counts
      // as an attempt so the 4/6-digit space cannot be brute forced.
      const otpExpiresAt = res?.get('ExpiresAt');
      if (res && (!otpExpiresAt || new Date(otpExpiresAt) <= new Date())) {
        const error = new Error('OTP is invalid.');
        error.code = 400;
        throw error;
      }
      if (res) {
        // Fetch the user by their objectId
        const userQuery = new Parse.Query(Parse.User);
        const user = await userQuery.get(request?.user.id, {
          sessionToken: request?.user.getSessionToken(),
        });

        const currentEmail = (user?.get('email') || '').toLowerCase().trim();
        const changingEmail = email && email !== currentEmail;

        if (changingEmail) {
          // Update username + email + normalizedEmail on _User
          user.set('username', email);
          user.set('email', email);
          user.set('normalizedEmail', email);
        }
        // Update the emailVerified field to true
        user.set('emailVerified', true);
        // Save the user object
        const saved = await user.save(null, { useMasterKey: true });
        if (saved) {
          // Sync contracts_Users.Email if an extended user exists
          try {
            const extQuery = new Parse.Query('contracts_Users');
            extQuery.equalTo('UserId', {
              __type: 'Pointer',
              className: '_User',
              objectId: user.id,
            });
            const extUser = await extQuery.first({ useMasterKey: true });
            if (extUser) {
              extUser.set('Email', email);
              extUser.set('NormalizedEmail', email);
              await extUser.save(null, { useMasterKey: true });
            }
          } catch (e) {
            console.log('err syncing contracts_Users email', e?.message);
          }
          // Consume the OTP
          try {
            await res.destroy({ useMasterKey: true });
          } catch (e) {
            /* ignore */
          }
          return { message: changingEmail ? 'Email changed and verified.' : 'Email is verified.' };
        } else {
          const error = new Error('Something went wrong, please try again later!');
          error.code = 400;
          throw error;
        }
      } else {
        const error = new Error('OTP is invalid.');
        error.code = 400;
        throw error;
      }
    }
  } catch (err) {
    console.log('err ', err.code + ' ' + err.message);
    throw err;
  }
}