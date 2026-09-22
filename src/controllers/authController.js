const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const { accountSelect } = require("../utils/selects");
const { hashPassword, verifyPassword } = require("../utils/password");
const { setAuthCookie, clearAuthCookie } = require("../utils/token");
const {
  registerSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
} = require("../validators/schemas");

const register = async (req, res) => {
  const { name, username, email, password } = registerSchema.parse(req.body);

  const taken = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });

  if (taken) {
    const field = taken.email === email ? "email" : "username";
    const message = field === "email" ? "An account with this email already exists" : "This username is taken";
    throw AppError.conflict(message, [{ field, message }]);
  }

  const user = await prisma.user.create({
    data: { name, username, email, passwordHash: await hashPassword(password) },
    select: accountSelect,
  });

  setAuthCookie(res, user.id);
  res.status(201).json({ user });
};

const login = async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...accountSelect, passwordHash: true },
  });

  // Hash anyway when the user doesn't exist so response times don't reveal which emails are registered.
  const valid = user ? await verifyPassword(password, user.passwordHash) : await hashPassword(password).then(() => false);

  if (!valid) throw AppError.unauthorized("Invalid email or password");

  const { passwordHash, ...account } = user;
  setAuthCookie(res, account.id);
  res.json({ user: account });
};

const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
};

const me = (req, res) => {
  res.json({ user: req.user ?? null });
};

const updateMe = async (req, res) => {
  const data = profileSchema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: accountSelect,
  });

  res.json({ user });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const { passwordHash } = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.id },
    select: { passwordHash: true },
  });

  if (!(await verifyPassword(currentPassword, passwordHash))) {
    const message = "Current password is incorrect";
    throw AppError.badRequest(message, [{ field: "currentPassword", message }]);
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  res.status(204).end();
};

module.exports = { register, login, logout, me, updateMe, changePassword };
