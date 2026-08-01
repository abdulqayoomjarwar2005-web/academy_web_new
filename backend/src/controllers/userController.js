const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');

/**
 * GET /api/users/admins
 * List all owner + admin accounts.
 * Allowed: owner
 */
const listAdmins = async (req, res) => {
  try {
    const admins = await UserModel.listByRoles(['owner', 'admin']);
    return res.status(200).json({ admins });
  } catch (err) {
    console.error('List admins error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/users/admins
 * Create a new admin login account.
 * Body: { fullName, email, password }
 * Allowed: owner
 */
const createAdmin = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      fullName,
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
      mustChangePassword: true,
    });

    return res.status(201).json({
      message: 'Admin account created. Share this email and temporary password with them — they will be asked to change it on first login.',
      admin: { id: user.id, fullName: user.full_name, email: user.email },
    });
  } catch (err) {
    console.error('Create admin error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/users/admins/:id/activate
 * PATCH /api/users/admins/:id/deactivate
 * Allowed: owner
 */
const setAdminStatus = (isActive) => async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own account status' });
    }

    const updated = await UserModel.setActive(id, isActive);
    if (!updated) {
      return res.status(404).json({ message: 'Account not found' });
    }

    return res.status(200).json({ message: `Account ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (err) {
    console.error('Set admin status error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/users/admins/:id/reset-password
 * Owner issues a new temporary password for an admin (e.g. they're locked out).
 * Body: { newPassword }
 * Allowed: owner
 */
const resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.adminSetPassword(id, passwordHash);

    return res.status(200).json({ message: 'Temporary password set. Share it with them — they will be asked to change it on next login.' });
  } catch (err) {
    console.error('Reset admin password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  listAdmins,
  createAdmin,
  activateAdmin: setAdminStatus(true),
  deactivateAdmin: setAdminStatus(false),
  resetAdminPassword,
};
