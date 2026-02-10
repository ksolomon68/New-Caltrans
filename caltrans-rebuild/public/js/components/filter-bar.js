/**
 * Filter Bar Component
 * Handles opportunity filtering and search functionality
 */

let allOpportunities = [];
let filteredOpportunities = [];
let districts = [];
let categories = [];

// Load data on page load
document.addEventListener('DOMContentLoaded', async function () {
    try {
        console.log('CaltransBizConnect: Starting opportunities data load');

        // Use DataService if available, otherwise fallback to native fetch
        const fetcher = (window.DataService && typeof window.DataService.fetch === 'function')
            ? window.DataService.fetch.bind(window.DataService)
            : async (url) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            };

        // Load districts and categories in parallel
        console.log('CaltransBizConnect: Loading filters...');
        const [districtsData, categoriesData] = await Promise.all([
            fetcher('/data/districts.json').catch(err => {
                console.error('Failed to load districts.json:', err);
                return { districts: [] };
            }),
            fetcher('/data/work-categories.json').catch(err => {
                console.error('Failed to load work-categories.json:', err);
                return { categories: [] };
            })
        ]);

        districts = districtsData.districts || [];
        categories = categoriesData.categories || [];

        // Load opportunities from backend API
        console.log('CaltransBizConnect: Loading opportunities...');
        const allData = await fetcher('/opportunities');

        if (!Array.isArray(allData)) {
            throw new Error('Opportunities data is not an array');
        }

        // Only show published opportunities to general users
        allOpportunities = allData.filter(opp => opp.status === 'published');
        filteredOpportunities = [...allOpportunities];

        // Populate filter dropdowns
        populateDistrictFilter();
        populateCategoryFilter();

        // Display opportunities
        displayOpportunities();
        updateResultsCount();

        // Set up event listeners
        setupEventListeners();

        console.log(`CaltransBizConnect: Loaded ${allOpportunities.length} opportunities successfully`);

    } catch (error) {
        console.error('CaltransBizConnect: Fatal error loading opportunities page data:', error);
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.innerHTML = `<span class="text-error">Error loading opportunities. Please refresh the page.</span><br><small class="text-muted">Details: ${error.message}</small>`;
        }
    }
});

// Populate district filter
function populateDistrictFilter() {
    const select = document.getElementById('districtFilter');
    if (!select) return;

    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district.id;
        option.textContent = district.name;
        select.appendChild(option);
    });
}

// Populate category filter
function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Display opportunities
function displayOpportunities() {
    const container = document.getElementById('opportunityList');
    const noResults = document.getElementById('noResults');
    if (!container || !noResults) return;

    if (filteredOpportunities.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    container.innerHTML = '';

    filteredOpportunities.forEach(opp => {
        const card = createOpportunityCard(opp);
        container.appendChild(card);
    });
}

// Create opportunity card
function createOpportunityCard(opp) {
    const card = document.createElement('article');
    card.className = 'opportunity-card';
    card.setAttribute('aria-labelledby', `opp-title-${opp.id}`);

    // Robust property access (handle both camelCase and snake_case)
    const dueDateVal = opp.dueDate || opp.due_date;
    const dueTimeVal = opp.dueTime || opp.due_time;
    const districtNameVal = opp.districtName || opp.district_name || ('District ' + opp.district);
    const categoryNameVal = opp.categoryName || opp.category_name;
    const estimatedValueVal = opp.estimatedValue || opp.estimated_value;
    const scopeSummaryVal = opp.scopeSummary || opp.scope_summary;

    const dueDate = new Date(dueDateVal);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    const dueDateFormatted = isNaN(dueDate.getTime()) ? 'Not specified' : dueDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    card.innerHTML = `
    <div class="opportunity-header">
      <div>
        <h3 id="opp-title-${opp.id}" class="opportunity-title" data-id="${opp.id}">${opp.title}</h3>
        <span class="badge badge-primary">${opp.id}</span>
      </div>
      <div>
        ${!isNaN(daysUntilDue) && daysUntilDue <= 7 && daysUntilDue >= 0 ? '<span class="badge badge-warning">Due Soon</span>' : ''}
        ${!isNaN(daysUntilDue) && daysUntilDue < 0 ? '<span class="badge badge-error">Closed</span>' : ''}
      </div>
    </div>
    
    <div class="opportunity-meta">
      <span class="opportunity-meta-item">
        <strong>District:</strong> ${districtNameVal}
      </span>
      <span class="opportunity-meta-item">
        <strong>Category:</strong> ${categoryNameVal}
      </span>
      <span class="opportunity-meta-item">
        <strong>Estimated Value:</strong> ${estimatedValueVal}
      </span>
      <span class="opportunity-meta-item">
        <strong>Due Date:</strong> ${dueDateFormatted} ${dueTimeVal ? 'at ' + dueTimeVal : ''}
      </span>
    </div>
    
    <div class="opportunity-description">
      <p>${scopeSummaryVal}</p>
    </div>
    
    <div class="opportunity-tags">
      <span class="badge badge-secondary">${opp.subcategory || ''}</span>
      <span class="badge badge-secondary">${opp.submissionMethod || opp.submission_method || ''}</span>
    </div>
    
    <div class="opportunity-actions">
      <button class="btn btn-outline btn-small" onclick="saveOpportunity('${opp.id}', this)">Save</button>
      <a href="opportunity-details.html?id=${opp.id}" class="btn btn-primary btn-small">View Details</a>
    </div>
  `;

    return card;
}

// Update results count
function updateResultsCount() {
    const count = filteredOpportunities.length;
    const total = allOpportunities.length;
    const countElement = document.getElementById('resultsCount');
    if (!countElement) return;

    if (count === total) {
        countElement.innerHTML = `Showing <strong>${count}</strong> ${count === 1 ? 'opportunity' : 'opportunities'}`;
    } else {
        countElement.innerHTML = `Showing <strong>${count}</strong> of <strong>${total}</strong> ${total === 1 ? 'opportunity' : 'opportunities'}`;
    }
}

// Apply filters
function applyFilters() {
    const districtFilter = document.getElementById('districtFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const dueDateFilter = document.getElementById('dueDateFilter').value;
    const keywordFilter = document.getElementById('keywordFilter').value.toLowerCase();

    filteredOpportunities = allOpportunities.filter(opp => {
        // District filter
        if (districtFilter && opp.district !== districtFilter) {
            return false;
        }

        // Category filter
        if (categoryFilter && opp.category !== categoryFilter) {
            return false;
        }

        // Due date filter
        if (dueDateFilter) {
            const dueDateVal = opp.dueDate || opp.due_date;
            if (!dueDateVal) return false;
            const dueDate = new Date(dueDateVal);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntilDue > parseInt(dueDateFilter)) {
                return false;
            }
        }

        // Keyword filter
        if (keywordFilter) {
            const scopeSummaryVal = opp.scopeSummary || opp.scope_summary || '';
            const districtNameVal = opp.districtName || opp.district_name || '';
            const categoryNameVal = opp.categoryName || opp.category_name || '';

            const searchableText = `${opp.title} ${scopeSummaryVal} ${districtNameVal} ${categoryNameVal} ${opp.subcategory || ''}`.toLowerCase();

            if (!searchableText.includes(keywordFilter)) {
                return false;
            }
        }

        return true;
    });

    displayOpportunities();
    updateResultsCount();
}

// Clear filters
function clearFilters() {
    document.getElementById('districtFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('dueDateFilter').value = '';
    document.getElementById('keywordFilter').value = '';

    filteredOpportunities = [...allOpportunities];
    displayOpportunities();
    updateResultsCount();
}

// Set up event listeners
function setupEventListeners() {
    const applyButton = document.getElementById('applyFilters');
    const clearButton = document.getElementById('clearFilters');
    const keywordInput = document.getElementById('keywordFilter');

    if (applyButton) {
        applyButton.addEventListener('click', applyFilters);
    }

    if (clearButton) {
        clearButton.addEventListener('click', clearFilters);
    }

    // Apply filters on Enter key in keyword field
    if (keywordInput) {
        keywordInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }

    // Auto-apply filters when dropdowns change
    const filterSelects = document.querySelectorAll('.filter-grid select');
    filterSelects.forEach(select => {
        select.addEventListener('change', applyFilters);
    });
}

// Global function for saving opportunity
window.saveOpportunity = async function (opportunityId, btnElement) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('caltrans_user'));

    if (!user) {
        alert('Please log in to save opportunities.');
        window.location.href = 'login.html';
        return;
    }

    try {
        if (btnElement) {
            btnElement.disabled = true;
            btnElement.textContent = 'Saving...';
        }

        const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';
        const response = await fetch(`${API_BASE}/opportunities/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId: user.id || user.email, opportunityId: opportunityId })
        });

        if (response.ok) {
            if (btnElement) {
                btnElement.textContent = 'Saved';
                btnElement.classList.remove('btn-outline');
                btnElement.classList.add('btn-success');
                btnElement.style.backgroundColor = 'var(--color-success)';
                btnElement.style.color = '#fff';
                btnElement.disabled = true;
            }
            alert('Opportunity saved successfully!');

            // Update local storage to reflect saved state
            let savedOpps = [];
            if (user.saved_opportunities) {
                try {
                    savedOpps = JSON.parse(user.saved_opportunities);
                } catch (e) {
                    savedOpps = [];
                }
            }
            if (!savedOpps.includes(opportunityId)) {
                savedOpps.push(opportunityId);
                user.saved_opportunities = JSON.stringify(savedOpps);
                localStorage.setItem('caltrans_user', JSON.stringify(user));
            }
        } else {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save');
        }
    } catch (error) {
        console.error('Error saving opportunity:', error);
        alert('Error: ' + error.message);
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = 'Save';
        }
    }
};

// Helper function to unsave an opportunity
async function unsaveOpportunity(opportunityId, btnElement) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('caltrans_user'));

    if (!user) return;

    try {
        const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';
        const response = await fetch(`${API_BASE}/opportunities/unsave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId: user.id || user.email, opportunityId: opportunityId })
        });

        if (response.ok) {
            // Update UI to unsaved state
            if (btnElement) {
                btnElement.textContent = 'Save';
                btnElement.classList.remove('btn-success');
                btnElement.classList.add('btn-outline');
                btnElement.style.backgroundColor = '';
                btnElement.style.color = '';
                btnElement.disabled = false;
            }

            // Update user's saved opportunities
            if (user.saved_opportunities) {
                try {
                    let savedOpps = JSON.parse(user.saved_opportunities);
                    savedOpps = savedOpps.filter(id => id !== opportunityId);
                    user.saved_opportunities = JSON.stringify(savedOpps);
                    localStorage.setItem('caltrans_user', JSON.stringify(user));
                } catch (e) {
                    console.error('Error updating saved opportunities:', e);
                }
            }

            alert('Opportunity removed from saved list.');
        } else {
            const err = await response.json();
            throw new Error(err.error || 'Failed to unsave');
        }
    } catch (error) {
        console.error('Error unsaving opportunity:', error);
        alert('Error: ' + error.message);
    }
}

// Helper to check if logged in
function isLoggedIn() {
    return localStorage.getItem('caltrans_user') !== null;
}
