export const generateInitialPassword = (): string => {
  const prefix = "LINKLIAN";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 6;

  let randomPart = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    randomPart += chars[randomIndex];
  }

  return `${prefix}${randomPart}`;
};
