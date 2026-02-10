/**
 * CaltransBizConnect - Main JavaScript
 * Handles navigation, accessibility enhancements, and common UI interactions
 */

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function () {
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');

  // Create overlay element for mobile
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  document.body.appendChild(overlay);

  if (navToggle && mainNav) {
    // Toggle menu
    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = mainNav.classList.toggle('open');
      navToggle.classList.toggle('active');
      overlay.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', isOpen);

      // Prevent body scroll when menu is open
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Close menu when clicking overlay
    overlay.addEventListener('click', function () {
      mainNav.classList.remove('open');
      navToggle.classList.remove('active');
      overlay.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });

    // Close menu when clicking a nav link
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function () {
        mainNav.classList.remove('open');
        navToggle.classList.remove('active');
        overlay.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mainNav.classList.contains('open')) {
        mainNav.classList.remove('open');
        navToggle.classList.remove('active');
        overlay.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        navToggle.focus();
      }
    });
  }

  // Handle Contact Form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (validateForm(contactForm)) {
        // Submit to backend
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);

        const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';
        fetch(`${API_BASE}/messages/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(response => {
            if (response.ok) {
              showSuccessMessage('Thank you for your message. It has been sent to SBEss@dot.ca.gov. We will get back to you soon.', contactForm.parentElement);
              contactForm.reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              showErrorMessage('Failed to send message. Please try again.', contactForm.parentElement);
            }
          })
          .catch(err => {
            console.error(err);
            showErrorMessage('An error occurred. Please try again later.', contactForm.parentElement);
          });
      }
    });
  }

  // Handle Issue Form
  const issueForm = document.getElementById('issueForm');
  if (issueForm) {
    issueForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (validateForm(issueForm)) {
        // Submit to backend
        const formData = new FormData(issueForm);
        const data = Object.fromEntries(formData);
        // Add specific issue reporting fields if needed or mapped
        data.issueType = data.issueType || 'General Issue';

        const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';
        fetch(`${API_BASE}/messages/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(response => {
            if (response.ok) {
              showSuccessMessage('Your issue report has been sent to SBEss@dot.ca.gov. Our technical team will review it.', issueForm.parentElement);
              issueForm.reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              showErrorMessage('Failed to submit report. Please try again.', issueForm.parentElement);
            }
          })
          .catch(err => {
            console.error(err);
            showErrorMessage('An error occurred. Please try again later.', issueForm.parentElement);
          });
      }
    });
  }

  // Handle Logout (Global)
  document.querySelectorAll('#logoutLink').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof logout === 'function') {
        logout();
      } else {
        // Fallback if auth.js is not loaded
        localStorage.removeItem('caltrans_user');
        window.location.href = 'index.html';
      }
    });
  });
});

// Form Validation Helper
function validateForm(formElement) {
  let isValid = true;
  const requiredFields = formElement.querySelectorAll('[required]');

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

  return isValid;
}

// Email Validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Show Success Message
function showSuccessMessage(message, container) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;

  container.insertBefore(alert, container.firstChild);

  // Focus on the alert for screen readers
  alert.setAttribute('tabindex', '-1');
  alert.focus();

  // Auto-remove after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Show Error Message
function showErrorMessage(message, container) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-error';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;

  container.insertBefore(alert, container.firstChild);

  // Focus on the alert for screen readers
  alert.setAttribute('tabindex', '-1');
  alert.focus();
}

// Format File Size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Debounce Function for Search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Smooth Scroll to Element
function smoothScrollTo(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    // Set focus for accessibility
    element.setAttribute('tabindex', '-1');
    element.focus();
  }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateForm,
    validateEmail,
    showSuccessMessage,
    showErrorMessage,
    formatFileSize,
    debounce,
    smoothScrollTo
  };
}
