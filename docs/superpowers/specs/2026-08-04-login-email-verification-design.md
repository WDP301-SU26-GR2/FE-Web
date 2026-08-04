# Login email-verification recovery

## Goal

Give a user whose password login is rejected with `Error.EmailNotVerified` a direct path to verify their email.

## Flow

1. The login hook identifies the stable API error code `Error.EmailNotVerified`.
2. The login form displays an inline verification notice and a button only for that error.
3. Selecting the button sends a `REGISTER` OTP to the email entered in the login form, stores that email as pending verification, and opens `/verify-email`.
4. The verification page accepts a six-digit OTP, calls `POST /auth/verify-email`, then returns the user to `/login` after success.
5. The verification page provides a resend action with a 60-second cooldown. API errors remain user-friendly and localized.

## Boundaries

- Use the generated `authControllerSendOtp` and `authControllerVerifyEmail` functions.
- Branch on the API `code`, not the raw backend message.
- Add the standalone route and export it through the auth feature barrel.
- Keep pending email in the existing safe storage utility; redirect to login if it is missing.
- Add matching English and Vietnamese translation keys.

## Validation

- A focused unit test covers recognizing `Error.EmailNotVerified`.
- Run the project's tests, typecheck, and lint after implementation.
