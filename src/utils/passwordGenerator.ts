export const generateInitialPassword = (): string => {
  const prefix = "LINKLIAN";

  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";

  const allChars = upper + lower + numbers;
  const length = 6;

  let randomPart = "";

  // บังคับให้มีอย่างน้อย 1 ตัวจากแต่ละกลุ่ม
  randomPart += upper[Math.floor(Math.random() * upper.length)];
  randomPart += lower[Math.floor(Math.random() * lower.length)];
  randomPart += numbers[Math.floor(Math.random() * numbers.length)];

  // เติมที่เหลือแบบสุ่ม
  for (let i = randomPart.length; i < length; i++) {
    randomPart += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // สลับตำแหน่งเพื่อไม่ให้เดา pattern ได้
  randomPart = randomPart
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return `${prefix}${randomPart}`;
};