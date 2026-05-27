/**
 * CaltransBizConnect Scroll Animation Utility
 * Uses Intersection Observer to trigger reveal animations
 */

const RevealAnimator = {
    init() {
        // Options for the intersection observer
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                    // Once animated, we don't need to observe it anymore
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        // Target elements with "reveal" classes
        const targets = document.querySelectorAll('.reveal-fade, .reveal-slide-up, .reveal-slide-left, .reveal-slide-right');

        targets.forEach(target => {
            // Apply staggered delay if attribute present
            const delay = target.getAttribute('data-delay');
            if (delay) {
                target.style.transitionDelay = delay;
            }
            observer.observe(target);
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    RevealAnimator.init();
});
