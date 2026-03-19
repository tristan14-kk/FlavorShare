const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const { isAuthenticated, verifyJWT } = require('../middleware/auth');
const { validateRecipe, validateObjectId, validateSearchQuery } = require('../middleware/validation');
const upload = require('../config/multer');

// ============================================
// Web Routes (Session-based)
// ============================================

// Home feed - Read all recipes
router.get('/home', isAuthenticated, validateSearchQuery, recipeController.getHome);

// Create recipe form
router.get('/recipes/new', isAuthenticated, recipeController.getCreateRecipe);

// Create recipe - POST
router.post('/recipes', 
  isAuthenticated, 
  upload.single('image'), 
  validateRecipe, 
  recipeController.postCreateRecipe
);

// View single recipe - READ
router.get('/recipes/:id', isAuthenticated, validateObjectId, recipeController.getRecipe);

// Edit recipe form
router.get('/recipes/:id/edit', isAuthenticated, validateObjectId, recipeController.getEditRecipe);

// Update recipe - PUT
router.put('/recipes/:id', 
  isAuthenticated, 
  validateObjectId,
  upload.single('image'), 
  validateRecipe, 
  recipeController.putUpdateRecipe
);

// Delete recipe - DELETE
router.delete('/recipes/:id', isAuthenticated, validateObjectId, recipeController.deleteRecipe);

// ============================================
// API Routes (JWT-based)
// ============================================

// Get all recipes (public)
router.get('/api/recipes', validateSearchQuery, recipeController.apiGetRecipes);

// Get single recipe (public)
router.get('/api/recipes/:id', validateObjectId, recipeController.apiGetRecipe);

module.exports = router;
