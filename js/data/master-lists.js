/**
 * Master Data Lists for CaltransBizConnect
 * Single source of truth for filter data used across the platform
 * Ensures consistency between opportunity search filters and small business profiles
 */

/**
 * @type {string[]}
 * All Caltrans districts from 1-12 plus Statewide
 */
export const CALTRANS_DISTRICTS = [
    'District 1',
    'District 2',
    'District 3',
    'District 4',
    'District 5',
    'District 6',
    'District 7',
    'District 8',
    'District 9',
    'District 10',
    'District 11',
    'District 12',
    'Statewide'
];

/**
 * @type {string[]}
 * Work categories for opportunity classification and small business specialization
 */
export const WORK_CATEGORIES = [
    'Construction',
    'Engineering/Architectural',
    'Professional Services',
    'Material Supplier',
    'Trucking/Hauling',
    'Traffic Control',
    'Environmental Services',
    'Landscaping'
];

/**
 * Initialize select dropdowns or multi-select fields with master lists
 * @param {string} elementId - ID of select element to populate
 * @param {string[]} dataArray - Array of values to populate
 * @param {boolean} isMultiSelect - Whether dropdown supports multiple selections
 */
export function populateDropdown(elementId, dataArray, isMultiSelect = false) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Clear existing options
    element.innerHTML = '';

    // Add placeholder option for single-select
    if (!isMultiSelect) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select...';
        element.appendChild(placeholder);
    }

    // Add data options
    dataArray.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        element.appendChild(option);
    });
}

/**
 * Create checkbox list for multi-select from master lists
 * @param {string} containerId - ID of container to populate
 * @param {string[]} dataArray - Array of values
 * @param {string} fieldName - Name attribute for checkboxes
 * @param {string[]} selectedValues - Previously selected values
 */
export function createCheckboxList(containerId, dataArray, fieldName, selectedValues = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    dataArray.forEach(value => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = fieldName;
        checkbox.value = value;
        checkbox.checked = selectedValues.includes(value);

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(value));
        container.appendChild(label);
    });
}

/**
 * Get selected values from checkbox list
 * @param {string} fieldName - Name attribute of checkboxes
 * @returns {string[]}
 */
export function getCheckboxValues(fieldName) {
    const checkboxes = document.querySelectorAll(`input[name="${fieldName}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}
