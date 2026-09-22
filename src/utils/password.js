const crypto = require("node:crypto");
const { promisify } = require("node:util");

// Node's built-in scrypt: memory-hard, no native dependencies to install.
const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, KEY_LENGTH);

  return `scrypt$${salt}$${hash.toString("hex")}`;
};

const verifyPassword = async (password, stored) => {
  const [scheme, salt, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, expected.length);

  return crypto.timingSafeEqual(expected, actual);
};

module.exports = { hashPassword, verifyPassword };
