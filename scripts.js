// MindCore Interactions

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mobile Menu ---
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            mobileBtn.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
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
    const openBtns = document.querySelectorAll('[data-open-modal]'); // Add this attribute to buttons
    const closeBtns = document.querySelectorAll('[data-close-modal]');
    const form = document.getElementById('interest-form');
    const successMsg = document.querySelector('.form-success');

    function openModal() {
        if (!modal) return;
        modal.style.display = 'block';
        // Small delay to allow display:block to apply before opacity transition if we added one
        requestAnimationFrame(() => {
            modal.setAttribute('aria-hidden', 'false');
        });
    }

    function closeModal() {
        if (!modal) return;
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            modal.style.display = 'none';
            if (form) form.reset();
            if (successMsg) successMsg.hidden = true;
            if (form) form.style.display = 'grid';
        }, 300); // Match transition duration
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
    }

    // --- Form Handling ---
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = form.email.value;
            const use = form.use.value;
            
            // Simulate submission
            console.log('Submitted:', { email, use });
            
            // Show success
            form.style.display = 'none';
            if (successMsg) successMsg.hidden = false;
            
            // Auto close
            setTimeout(closeModal, 2000);
        });
    }

    // --- Background Particles (Canvas) ---
    const canvas = document.getElementById('bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];

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
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle());
            }
            animate();
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        init();
    }
});


