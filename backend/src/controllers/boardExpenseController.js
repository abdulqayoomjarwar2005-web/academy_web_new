const BoardExpenseModel = require('../models/boardExpenseModel');

const getDashboard = async (req, res) => {
  try {
    const stats = await BoardExpenseModel.getDashboardStats();
    return res.status(200).json({ stats });
  } catch (err) {
    console.error('Board expense dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listExpenses = async (req, res) => {
  try {
    const { category, month, startDate, endDate, search, sortBy, sortDir, page, limit } = req.query;
    const result = await BoardExpenseModel.list({
      category, month, startDate, endDate, search, sortBy, sortDir, page, limit,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('List board expenses error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getExpense = async (req, res) => {
  try {
    const expense = await BoardExpenseModel.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense record not found' });
    return res.status(200).json({ expense });
  } catch (err) {
    console.error('Get board expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createExpense = async (req, res) => {
  try {
    const { expenseDate, category, description, amount } = req.body;
    const expense = await BoardExpenseModel.create({
      expenseDate, category, description, amount, createdBy: req.user.id,
    });
    return res.status(201).json({ message: 'Expense recorded', expense });
  } catch (err) {
    console.error('Create board expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { expenseDate, category, description, amount } = req.body;

    const existing = await BoardExpenseModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Expense record not found' });

    const expense = await BoardExpenseModel.update(req.params.id, {
      expenseDate, category, description, amount, updatedBy: req.user.id,
    });
    return res.status(200).json({ message: 'Expense updated', expense });
  } catch (err) {
    console.error('Update board expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const existing = await BoardExpenseModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Expense record not found' });

    await BoardExpenseModel.remove(req.params.id);
    return res.status(200).json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete board expense error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getDashboard, listExpenses, getExpense, createExpense, updateExpense, deleteExpense };
