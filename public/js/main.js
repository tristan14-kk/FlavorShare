// ============================================
// FlavorShare - Main JavaScript
// ============================================

// Make functions globally available
window.addIngredient = function() {
  const container = document.getElementById('ingredients-container');
  if (!container) {
    alert('Error: ingredients container not found');
    return;
  }
  const div = document.createElement('div');
  div.className = 'dynamic-input';
  div.innerHTML = '<input type="text" name="ingredients" placeholder="e.g., 2 cups flour"><button type="button" class="btn-remove" onclick="window.removeInput(this)">×</button>';
  container.appendChild(div);
  div.querySelector('input').focus();
};

window.addInstruction = function() {
  const container = document.getElementById('instructions-container');
  if (!container) {
    alert('Error: instructions container not found');
    return;
  }
  const stepNum = container.querySelectorAll('.dynamic-input').length + 1;
  const div = document.createElement('div');
  div.className = 'dynamic-input';
  div.innerHTML = '<textarea name="instructions" rows="2" placeholder="Step ' + stepNum + ': ..."></textarea><button type="button" class="btn-remove" onclick="window.removeInput(this)">×</button>';
  container.appendChild(div);
  div.querySelector('textarea').focus();
};

window.removeInput = function(button) {
  const inputDiv = button.parentElement;
  const container = inputDiv.parentElement;
  if (container.querySelectorAll('.dynamic-input').length > 1) {
    inputDiv.remove();
  } else {
    alert('You need at least one item!');
  }
};

// Image Preview
document.addEventListener('DOMContentLoaded', function() {
  const imageInput = document.getElementById('image');
  const imagePreview = document.getElementById('imagePreview');

  if (imageInput && imagePreview) {
    imageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          imagePreview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
          imagePreview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
      }
    });
  }
});
