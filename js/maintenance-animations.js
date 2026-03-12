document.addEventListener('DOMContentLoaded', () => {
    // Current year for footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    // Handle form submission
    const notifyForm = document.getElementById('notify-form');
    const successMsg = document.getElementById('success-msg');

    if (notifyForm) {
        notifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = notifyForm.querySelector('.notification-btn');
            
            // Simulate API call
            btn.textContent = 'Submitting...';
            btn.disabled = true;

            setTimeout(() => {
                notifyForm.style.display = 'none';
                successMsg.style.display = 'block';
            }, 1000);
        });
    }
});
