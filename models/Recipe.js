const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Recipe title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Recipe description is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Beverages']
  },
  cookingTime: {
    type: String,
    required: [true, 'Cooking time is required'],
    trim: true
  },
  servings: {
    type: String,
    required: [true, 'Number of servings is required'],
    trim: true
  },
  image: {
    type: String,
    default: '/images/default-recipe.svg'
  },
  // Track if image is stored in Firebase or locally
  imageStorage: {
    type: String,
    enum: ['local', 'firebase'],
    default: 'local'
  },
  ingredients: [{
    type: String,
    required: true
  }],
  instructions: [{
    type: String,
    required: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['published', 'draft'],
    default: 'published'
  },
  views: {
    type: Number,
    default: 0
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  }]
}, {
  timestamps: true
});

// Virtual for average rating
recipeSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
  return (sum / this.ratings.length).toFixed(1);
});

// Ensure virtuals are included
recipeSchema.set('toJSON', { virtuals: true });
recipeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Recipe', recipeSchema);
