// MindCore Interactions
// Version 2.0 - Enhanced with analytics, FAQ, and improved form handling

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Analytics Placeholder ---
    // Replace with your actual analytics (Google Analytics, Mixpanel, etc.)
    const analytics = {
        track: (event, data = {}) => {
            console.log('[Analytics]', event, data);
            // Example: gtag('event', event, data);
            // Example: mixpanel.track(event, data);
        },
        page: (pageName) => {
            console.log('[Analytics] Page View:', pageName);
            // Example: gtag('event', 'page_view', { page_title: pageName });
        }
    };
    
    // Track page view
    analytics.page(document.title);
    
    // --- Mobile Menu ---
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            mobileBtn.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
            analytics.track('mobile_menu_toggle', { open: navLinks.classList.contains('open') });
        });
    }

    // --- Scroll Reveal ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
    });

    // --- Modal Logic ---
    const modal = document.getElementById('interest-modal');
    const openBtns = document.querySelectorAll('[data-open-modal]');
    const closeBtns = document.querySelectorAll('[data-close-modal]');
    const form = document.getElementById('interest-form');
    const successMsg = document.querySelector('.form-success');

    function openModal() {
        if (!modal) return;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('aria-modal', 'true');
        });
        analytics.track('modal_open', { modal: 'interest-modal' });
    }

    function closeModal() {
        if (!modal) return;
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('aria-modal', 'false');
        document.body.style.overflow = '';
        setTimeout(() => {
            modal.style.display = 'none';
            if (form) form.reset();
            if (successMsg) successMsg.hidden = true;
            if (form) form.style.display = 'grid';
        }, 300);
        analytics.track('modal_close', { modal: 'interest-modal' });
    }

    openBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    }));

    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                closeModal();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
                closeModal();
            }
        });
    }

    // --- Form Handling with Validation ---
    const forms = document.querySelectorAll('form');
    
    forms.forEach(formEl => {
        formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = formEl.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : '';
            const formData = new FormData(formEl);
            const data = Object.fromEntries(formData.entries());
            
            // Validate email
            const emailInput = formEl.querySelector('input[type="email"]');
            if (emailInput && !isValidEmail(emailInput.value)) {
                showFormError(emailInput, 'Please enter a valid email address');
                return;
            }
            
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="btn-loader"></span> Sending...';
            }
            
            try {
                // Simulate API call (replace with actual endpoint)
                await simulateSubmission(data);
                
                // Track successful submission
                analytics.track('form_submit', { 
                    form: formEl.id || 'unknown',
                    fields: Object.keys(data)
                });
                
                // Show success
                const successEl = formEl.parentElement.querySelector('.form-success');
                if (successEl) {
                    formEl.style.display = 'none';
                    successEl.hidden = false;
                }
                
                // If in modal, auto close
                if (modal && modal.contains(formEl)) {
                    setTimeout(closeModal, 2500);
                }
                
            } catch (error) {
                console.error('Form submission error:', error);
                analytics.track('form_error', { form: formEl.id, error: error.message });
                
                // Show error message
                showFormMessage(formEl, 'Something went wrong. Please try again.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    });
    
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    function showFormError(input, message) {
        input.style.borderColor = '#ff375f';
        
        // Remove existing error
        const existingError = input.parentElement.querySelector('.form-error');
        if (existingError) existingError.remove();
        
        const errorEl = document.createElement('span');
        errorEl.className = 'form-error';
        errorEl.style.cssText = 'color: #ff375f; font-size: 12px; margin-top: 4px; display: block;';
        errorEl.textContent = message;
        input.parentElement.appendChild(errorEl);
        
        input.addEventListener('input', () => {
            input.style.borderColor = '';
            errorEl.remove();
        }, { once: true });
    }
    
    function showFormMessage(form, message, type = 'success') {
        const existingMsg = form.querySelector('.form-message');
        if (existingMsg) existingMsg.remove();
        
        const msgEl = document.createElement('div');
        msgEl.className = 'form-message';
        msgEl.style.cssText = `
            padding: 12px;
            border-radius: 8px;
            margin-top: 16px;
            font-size: 14px;
            background: ${type === 'error' ? 'rgba(255, 55, 95, 0.1)' : 'rgba(48, 209, 88, 0.1)'};
            color: ${type === 'error' ? '#ff375f' : '#30d158'};
            border: 1px solid ${type === 'error' ? 'rgba(255, 55, 95, 0.3)' : 'rgba(48, 209, 88, 0.3)'};
        `;
        msgEl.textContent = message;
        form.appendChild(msgEl);
        
        setTimeout(() => msgEl.remove(), 5000);
    }
    
    function simulateSubmission(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Store in localStorage as backup (for demo purposes)
                const submissions = JSON.parse(localStorage.getItem('mindcore_submissions') || '[]');
                submissions.push({
                    ...data,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('mindcore_submissions', JSON.stringify(submissions));
                
                console.log('Form data saved:', data);
                resolve({ success: true });
            }, 1000);
        });
    }

    // --- FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (question && answer) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('open')) {
                        otherItem.classList.remove('open');
                        otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    }
                });
                
                // Toggle current item
                item.classList.toggle('open');
                question.setAttribute('aria-expanded', !isOpen);
                
                analytics.track('faq_toggle', { 
                    question: question.textContent.trim().substring(0, 50),
                    open: !isOpen
                });
            });
        }
    });

    // --- Smooth Scroll for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without scroll jump
                history.pushState(null, null, targetId);
            }
        });
    });

    // --- Track CTA Clicks ---
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', () => {
            analytics.track('cta_click', {
                text: btn.textContent.trim(),
                href: btn.href || 'no-href',
                page: window.location.pathname
            });
        });
    });

    // --- Background Particles (Canvas) ---
    const canvas = document.getElementById('bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let animationId;

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.opacity = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x > width) this.x = 0;
                if (this.x < 0) this.x = width;
                if (this.y > height) this.y = 0;
                if (this.y < 0) this.y = height;
            }
            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function init() {
            resize();
            particles = [];
            for (let i = 0; i < 60; i++) {
                particles.push(new Particle());
            }
            animate();
        }

        function connectParticles() {
            const maxDistance = 150;
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        const opacity = 1 - (distance / maxDistance);
                        ctx.strokeStyle = `rgba(41, 151, 255, ${opacity * 0.15})`; // Blue tint
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            
            // Draw connections first so particles sit on top
            connectParticles();

            particles.forEach(p => {
                p.update();
                p.draw();
            });
            
            animationId = requestAnimationFrame(animate);
        }
        
        // Pause animation when tab is not visible (performance)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(animationId);
            } else {
                animate();
            }
        });

        window.addEventListener('resize', resize);
        init();
    }

    // --- Console Easter Egg ---
    console.log('%c🧠 MindCore', 'font-size: 24px; font-weight: bold; color: #2997ff;');
    console.log('%cBuilding AI that understands you.', 'font-size: 14px; color: #86868b;');
    console.log('%cInterested in joining? → careers@mindcore.ai', 'font-size: 12px; color: #30d158;');

    // --- Glitch Effect Initialization ---
    const glitchElements = document.querySelectorAll('.brand span, h1');
    glitchElements.forEach(el => {
        el.classList.add('glitch-hover');
        el.setAttribute('data-text', el.textContent);
    });
});
