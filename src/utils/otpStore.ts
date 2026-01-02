interface OtpSession {
  user_id: number;
  otp: string;
  expires_at: number;
  used: boolean;
}

const otpStore = new Map<string, OtpSession>();

export const saveOtpSession = (
  sessionId: string,
  data: OtpSession
) => {
  otpStore.set(sessionId, data);
};

export const getOtpSession = (sessionId: string) => {
  return otpStore.get(sessionId);
};

export const markOtpUsed = (sessionId: string) => {
  const session = otpStore.get(sessionId);
  if (session) {
    session.used = true;
    otpStore.set(sessionId, session);
  }
};

export const deleteOtpSession = (sessionId: string) => {
  otpStore.delete(sessionId);
};