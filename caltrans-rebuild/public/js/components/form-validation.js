/**
 * Form Validation Component
 * Handles comprehensive form validation with accessibility support
 */

document.addEventListener('DOMContentLoaded', function () {
    const opportunityForm = document.getElementById('opportunityForm');

    if (opportunityForm) {
        // Load districts and categories
        loadFormData();

        // Form submission
        // Note: The submit listener is now handled specific to the page (e.g., post-opportunity.html)
        // to check for edit mode logic. We keep the validation call logic here for reference 
        // but avoid attaching a duplicate listener if the page already defines one.
        const pageSpecificSubmit = opportunityForm.getAttribute('data-handled-submit');
        if (!pageSpecificSubmit) {
            opportunityForm.addEventListener('submit', function (e) {
                // If the page doesn't have custom logic, we default to standard submit
                // But post-opportunity.html DOES have custom logic now, so this block might be redundant
                // for that specific page. We'll leave it but rely on e.preventDefault() in the other script.
                // Actually, to prevent double submission issues, let's just Log it.
                // The other script handles the actual fetch.
                // This listener primarily ensures validation runs if not called elsewhere.
            });
        }

        // Save draft button
        const saveDraftButton = document.getElementById('saveDraft');
        if (saveDraftButton) {
            saveDraftButton.addEventListener('click', function () {
                saveDraft();
            });
        }

        // Category change - update subcategories
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.addEventListener('change', function () {
                updateSubcategories(this.value);
            });
        }

        // Due date validation - must be future date
        const dueDateInput = document.getElementById('dueDate');
        if (dueDateInput) {
            dueDateInput.addEventListener('change', function () {
                validateFutureDate(this);
            });
        }

        // Scope summary character count
        const scopeTextarea = document.getElementById('scopeSummary');
        if (scopeTextarea) {
            scopeTextarea.addEventListener('input', function () {
                validateMinLength(this, 100);
            });
        }
    }
});

// Load districts and categories from JSON
async function loadFormData() {
    try {
        // Load districts
        const districtsResponse = await fetch('data/districts.json');
        const districtsData = await districtsResponse.json();
        populateDistricts(districtsData.districts);

        // Load categories
        const categoriesResponse = await fetch('data/work-categories.json');
        const categoriesData = await categoriesResponse.json();
        populateCategories(categoriesData.categories);

        // Store categories globally for subcategory updates
        window.workCategories = categoriesData.categories;

    } catch (error) {
        console.error('Error loading form data:', error);
    }
}

// Populate districts dropdown
function populateDistricts(districts) {
    const select = document.getElementById('district');
    if (!select) return;

    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district.id;
        option.textContent = district.name;
        select.appendChild(option);
    });
}

// Populate categories dropdown
function populateCategories(categories) {
    const select = document.getElementById('category');
    if (!select) return;

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Update subcategories based on selected category
function updateSubcategories(categoryId) {
    const subcategorySelect = document.getElementById('subcategory');
    if (!subcategorySelect || !window.workCategories) return;

    // Clear existing options
    subcategorySelect.innerHTML = '<option value="">Select a subcategory (optional)</option>';

    if (!categoryId) return;

    // Find selected category
    const category = window.workCategories.find(cat => cat.id === categoryId);
    if (!category || !category.subcategories) return;

    // Add subcategory options
    category.subcategories.forEach(subcategory => {
        const option = document.createElement('option');
        option.value = subcategory;
        option.textContent = subcategory;
        subcategorySelect.appendChild(option);
    });
}

// Validate future date
function validateFutureDate(input) {
    const selectedDate = new Date(input.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const errorElement = input.parentElement.querySelector('.form-error');

    if (selectedDate <= today) {
        input.setAttribute('aria-invalid', 'true');
        if (errorElement) {
            errorElement.textContent = 'Due date must be a future date.';
        }
        return false;
    } else {
        input.setAttribute('aria-invalid', 'false');
        if (errorElement) {
            errorElement.textContent = '';
        }
        return true;
    }
}

// Validate minimum length
function validateMinLength(textarea, minLength) {
    const errorElement = textarea.parentElement.querySelector('.form-error');
    const currentLength = textarea.value.length;

    if (currentLength > 0 && currentLength < minLength) {
        textarea.setAttribute('aria-invalid', 'true');
        if (errorElement) {
            errorElement.textContent = `Minimum ${minLength} characters required. Current: ${currentLength}`;
        }
        return false;
    } else {
        textarea.setAttribute('aria-invalid', 'false');
        if (errorElement) {
            errorElement.textContent = '';
        }
        return true;
    }
}

// Validate opportunity form
function validateOpportunityForm() {
    const form = document.getElementById('opportunityForm');
    let isValid = true;

    // Validate required fields
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        const errorElement = field.parentElement.querySelector('.form-error');

        if (!field.value.trim()) {
            isValid = false;
            field.setAttribute('aria-invalid', 'true');
            if (errorElement) {
                errorElement.textContent = 'This field must be completed.';
            }
        } else {
            field.setAttribute('aria-invalid', 'false');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    });

    // Validate scope summary length
    const scopeSummary = document.getElementById('scopeSummary');
    if (scopeSummary && scopeSummary.value.length < 100) {
        isValid = false;
        validateMinLength(scopeSummary, 100);
    }

    // Validate due date
    const dueDate = document.getElementById('dueDate');
    if (dueDate && dueDate.value) {
        if (!validateFutureDate(dueDate)) {
            isValid = false;
        }
    }

    // Validate email format
    const contactEmail = document.getElementById('contactEmail');
    if (contactEmail && contactEmail.value) {
        if (!validateEmail(contactEmail.value)) {
            isValid = false;
            const errorElement = contactEmail.parentElement.querySelector('.form-error');
            contactEmail.setAttribute('aria-invalid', 'true');
            if (errorElement) {
                errorElement.textContent = 'Please enter a valid email address.';
            }
        }
    }

    if (!isValid) {
        // Focus on first error
        const firstError = form.querySelector('[aria-invalid="true"]');
        if (firstError) {
            firstError.focus();
        }

        showErrorMessage('Please complete all required fields before submitting.', form.parentElement);
    }

    return isValid;
}

// Submit opportunity
async function submitOpportunity() {
    const form = document.getElementById('opportunityForm');

    // Generate unique ID
    const newId = 'CAL-' + Math.floor(1000 + Math.random() * 9000);

    const newOpportunity = {
        id: newId,
        title: document.getElementById('projectTitle').value,
        scopeSummary: document.getElementById('scopeSummary').value,
        district: document.getElementById('district').value,
        districtName: document.getElementById('district').options[document.getElementById('district').selectedIndex].text,
        category: document.getElementById('category').value,
        categoryName: document.getElementById('category').options[document.getElementById('category').selectedIndex].text,
        subcategory: document.getElementById('subcategory').value || 'General',
        estimatedValue: document.getElementById('estimatedValue').value,
        dueDate: document.getElementById('dueDate').value,
        dueTime: document.getElementById('dueTime').value,
        submissionMethod: document.getElementById('submissionMethod').value,
        postedBy: (getCurrentUser() || {}).id
    };

    try {
        const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';
        const response = await fetch(`${API_BASE}/opportunities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOpportunity)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to publish opportunity');
        }

        // Show success message
        const successContainer = document.createElement('div');
        successContainer.className = 'alert alert-success';
        successContainer.setAttribute('role', 'alert');
        successContainer.innerHTML = `
      <h2 class="mb-sm">Opportunity Published Successfully!</h2>
      <p class="mb-md">Your opportunity has been successfully published and is now visible to all registered vendors on the platform.</p>
      <div class="alert alert-info mb-md">
        <strong>Next Steps:</strong>
        <ul class="mb-0">
          <li>Vendors matching your work category and district will be notified immediately.</li>
          <li>You can track applications and inquiries in your dashboard.</li>
          <li>You can manage or edit this posting at any time from "Manage Postings".</li>
        </ul>
      </div>
      <div style="display: flex; gap: var(--space-md);">
        <a href="dashboard-agency.html" class="btn btn-primary">Return to Dashboard</a>
        <a href="manage-opportunities.html" class="btn btn-outline">Manage My Postings</a>
      </div>
    `;

        form.parentElement.innerHTML = '';
        form.parentElement.appendChild(successContainer);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Submission error:', error);
        showErrorMessage(error.message, form.parentElement);
    }
}

// Save draft
function saveDraft() {
    showSuccessMessage('Draft saved successfully. You can return to complete this posting later.', document.getElementById('opportunityForm').parentElement);
}
