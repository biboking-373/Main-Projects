const express = require("express");
const employeeController = require("../controllers/adminaddController");
const { isAdmin, isEmployee } = require("../middleware/adminaddMiddleware");
const { isAuthenticated } = require("../middleware/authMiddleware");

// Create separate routers
const adminRouter = express.Router();
const employeeRouter = express.Router();

/* =========================
   ADMIN ROUTES
   ========================= */

// Admin auth middleware (applies to ALL admin routes)
adminRouter.use(isAuthenticated);
adminRouter.use(isAdmin);

// GET all employees
adminRouter.get("/", employeeController.getAllEmployees);

// GET employee by ID
adminRouter.get("/:id", employeeController.getEmployeeById);

// POST add new employee
adminRouter.post("/", employeeController.addEmployee);

// PUT update employee
adminRouter.put("/:id", employeeController.updateEmployee);

// DELETE employee
adminRouter.delete("/:id", employeeController.deleteEmployee);

/* =========================
   EMPLOYEE ROUTES
   ========================= */

// Employee auth middleware
employeeRouter.use(isAuthenticated);
employeeRouter.use(isEmployee);

// GET own profile
employeeRouter.get("/profile", employeeController.getProfile);

// PUT update own profile
employeeRouter.put("/profile", employeeController.updateProfile);

// PUT change password
employeeRouter.put("/change-password", employeeController.changePassword);

module.exports = {
   adminRouter,
   employeeRouter
};
