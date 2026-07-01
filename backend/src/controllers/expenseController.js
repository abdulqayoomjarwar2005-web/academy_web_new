const ExpenseModel = require('../models/expenseModel');

// -------------------------------------------------------
// GET /api/expenses/dashboard
// -------------------------------------------------------
const getDashboard = async (req, res) => {
  try {
    const stats = await ExpenseModel.getDashboardStats();
    return res.status(200).json({ stats });
  } catch (err) {
    console.error('Expense dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/expenses
// -------------------------------------------------------
const listExpenses = async (req, res) => {
  try {
    const { category, month, startDate, endDate, search, sortBy, sortDir, page, limit } = req.query;

    const result = await ExpenseModel.list({
      category,
      month,
      startDate,
      endDate,
      search,
      sortBy,
      sortDir,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('List expenses error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/expenses/:id
// -------------------------------------------------------
const getExpense = async (req, res) => {
  try {
    const expense = await ExpenseModel.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense record not found' });
    return res.status(200).json({ expense });
  } catch (err) {
    console.error('Get expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// POST /api/expenses
// -------------------------------------------------------
const createExpense = async (req, res) => {
  try {
    const { expenseDate, category, description, amount } = req.body;

    const expense = await ExpenseModel.create({
      expenseDate,
      category,
      description,
      amount,
      createdBy: req.user.id,
    });

    return res.status(201).json({ message: 'Expense recorded', expense });
  } catch (err) {
    console.error('Create expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// PATCH /api/expenses/:id
// -------------------------------------------------------
const updateExpense = async (req, res) => {
  try {
    const { expenseDate, category, description, amount } = req.body;

    const existing = await ExpenseModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Expense record not found' });

    const expense = await ExpenseModel.update(req.params.id, {
      expenseDate,
      category,
      description,
      amount,
      updatedBy: req.user.id,
    });

    return res.status(200).json({ message: 'Expense updated', expense });
  } catch (err) {
    console.error('Update expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// DELETE /api/expenses/:id
// -------------------------------------------------------
const deleteExpense = async (req, res) => {
  try {
    const existing = await ExpenseModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Expense record not found' });

    await ExpenseModel.remove(req.params.id);
    return res.status(200).json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
};
