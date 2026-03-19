const Recipe = require('../models/Recipe');
const fs = require('fs');
const path = require('path');
const { asyncHandler, notFound, forbidden } = require('../middleware/errorHandler');

// ============================================
// Home Feed - Get All Recipes
// ============================================
exports.getHome = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  
  let query = { status: 'published' };
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (category && category !== 'all') {
    query.category = category;
  }

  const recipes = await Recipe.find(query)
    .populate('author', 'fullName username profileImage')
    .sort({ createdAt: -1 });

  res.render('pages/home', {
    title: 'Home - FlavorShare',
    recipes,
    search: search || '',
    currentCategory: category || 'all',
    categories: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Beverages']
  });
});

// ============================================
// Get Create Recipe Form
// ============================================
exports.getCreateRecipe = (req, res) => {
  const errors = req.session.validationErrors || [];
  const oldInput = req.session.oldInput || {};
  
  delete req.session.validationErrors;
  delete req.session.oldInput;

  res.render('pages/create-recipe', {
    title: 'Create Recipe - FlavorShare',
    categories: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Beverages'],
    errors,
    oldInput
  });
};

// ============================================
// Create New Recipe
// ============================================
exports.postCreateRecipe = asyncHandler(async (req, res) => {
  const { title, description, category, cookingTime, servings, ingredients, instructions, status } = req.body;

  // Process ingredients and instructions (filter empty values)
  const processedIngredients = (Array.isArray(ingredients) ? ingredients : [ingredients])
    .filter(i => i && i.trim());
  const processedInstructions = (Array.isArray(instructions) ? instructions : [instructions])
    .filter(i => i && i.trim());

  // Handle image upload (Multer local storage)
  let imagePath = '/images/default-recipe.svg';

  if (req.file) {
    imagePath = '/uploads/' + req.file.filename;
  }

  // Determine the final status
  const finalStatus = (status === 'draft') ? 'draft' : 'published';

  // Create recipe
  const recipe = await Recipe.create({
    title,
    description,
    category,
    cookingTime,
    servings,
    image: imagePath,
    imageStorage: 'local',
    ingredients: processedIngredients,
    instructions: processedInstructions,
    author: req.session.userId,
    status: finalStatus
  });

  // Redirect based on status
  if (finalStatus === 'draft') {
    res.redirect('/profile?tab=drafts');
  } else {
    res.redirect('/recipes/' + recipe._id);
  }
});

// ============================================
// Get Single Recipe
// ============================================
exports.getRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id)
    .populate('author', 'fullName username profileImage bio');

  if (!recipe) {
    throw notFound('Recipe not found');
  }

  // Increment view count
  Recipe.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

  // Check if current user is the author
  const isAuthor = recipe.author._id.toString() === req.session.userId.toString();

  res.render('pages/recipe-detail', {
    title: `${recipe.title} - FlavorShare`,
    recipe,
    isAuthor
  });
});

// ============================================
// Get Edit Recipe Form
// ============================================
exports.getEditRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);

  if (!recipe) {
    throw notFound('Recipe not found');
  }

  // Check ownership (unless admin)
  if (recipe.author.toString() !== req.session.userId.toString() && 
      req.session.userRole !== 'admin') {
    throw forbidden('You can only edit your own recipes');
  }

  const errors = req.session.validationErrors || [];
  delete req.session.validationErrors;

  res.render('pages/edit-recipe', {
    title: 'Edit Recipe - FlavorShare',
    recipe,
    categories: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Beverages'],
    errors
  });
});

// ============================================
// Update Recipe
// ============================================
exports.putUpdateRecipe = asyncHandler(async (req, res) => {
  const { title, description, category, cookingTime, servings, ingredients, instructions, status } = req.body;

  const recipe = await Recipe.findById(req.params.id);

  if (!recipe) {
    throw notFound('Recipe not found');
  }

  // Check ownership (unless admin)
  if (recipe.author.toString() !== req.session.userId.toString() && 
      req.session.userRole !== 'admin') {
    throw forbidden('You can only edit your own recipes');
  }

  // Process ingredients and instructions
  const processedIngredients = (Array.isArray(ingredients) ? ingredients : [ingredients])
    .filter(i => i && i.trim());
  const processedInstructions = (Array.isArray(instructions) ? instructions : [instructions])
    .filter(i => i && i.trim());

  // Handle image upload
  if (req.file) {
    // Delete old image if not default
    if (recipe.image && recipe.image !== '/images/default-recipe.svg') {
      const oldPath = path.join(__dirname, '../public', recipe.image);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    recipe.image = '/uploads/' + req.file.filename;
    recipe.imageStorage = 'local';
  }

  // Update fields
  recipe.title = title;
  recipe.description = description;
  recipe.category = category;
  recipe.cookingTime = cookingTime;
  recipe.servings = servings;
  recipe.ingredients = processedIngredients;
  recipe.instructions = processedInstructions;
  recipe.status = status || 'published';

  await recipe.save();

  res.redirect('/recipes/' + recipe._id);
});

// ============================================
// Delete Recipe
// ============================================
exports.deleteRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);

  if (!recipe) {
    throw notFound('Recipe not found');
  }

  // Check ownership (unless admin)
  if (recipe.author.toString() !== req.session.userId.toString() && 
      req.session.userRole !== 'admin') {
    throw forbidden('You can only delete your own recipes');
  }

  // Delete image if not default
  if (recipe.image && recipe.image !== '/images/default-recipe.svg') {
    const imagePath = path.join(__dirname, '../public', recipe.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await Recipe.findByIdAndDelete(req.params.id);

  res.redirect('/profile');
});

// ============================================
// API: Get All Recipes (JSON)
// ============================================
exports.apiGetRecipes = asyncHandler(async (req, res) => {
  const { search, category, page = 1, limit = 10 } = req.query;
  
  let query = { status: 'published' };
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (category && category !== 'all') {
    query.category = category;
  }

  const recipes = await Recipe.find(query)
    .populate('author', 'fullName username')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Recipe.countDocuments(query);

  res.json({
    success: true,
    data: recipes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// ============================================
// API: Get Single Recipe (JSON)
// ============================================
exports.apiGetRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id)
    .populate('author', 'fullName username bio');

  if (!recipe) {
    throw notFound('Recipe not found');
  }

  res.json({
    success: true,
    data: recipe
  });
});
