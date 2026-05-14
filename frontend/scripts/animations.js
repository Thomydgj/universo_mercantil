// Animaci�n para contador de estad�sticas
document.addEventListener('DOMContentLoaded', function() {
    initHeroSlider();

    
    // Intersection Observer para detectar cuando la secci�n es visible
    const estadisticasSection = document.querySelector('.estadisticas');
    
    if (estadisticasSection) {
        const observerOptions = {
            threshold: 0.3,
            rootMargin: '0px'
        };
        
        let animated = false;
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animated) {
                    animated = true;
                    animateCounters();
                }
            });
        }, observerOptions);
        
        observer.observe(estadisticasSection);
    }
    
    function animateCounters() {
        const counters = document.querySelectorAll('.numero');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000; // 2 segundos
            const increment = target / (duration / 16); // 60 FPS
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target + (target === 100 ? '%' : '+');
                }
            };
            
            updateCounter();
        });
    }
    
    // Smooth scroll para los enlaces de navegaci�n
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // No aplicar smooth scroll si es solo "#"
            if (href === '#') return;
            
            e.preventDefault();
            
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Bot�n "Volver Arriba" y accesos r�pidos de contacto
    const backToTopButton = document.getElementById('backToTop');

    function updateFloatingButtons() {
        const scrollY = window.pageYOffset;
        const quickContactButtons = document.querySelector('.quick-contact');

        if (backToTopButton) {
            if (scrollY > 600) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        }

        if (quickContactButtons) {
            if (scrollY > 600) {
                quickContactButtons.classList.add('visible');
            } else {
                quickContactButtons.classList.remove('visible');
            }
        }
    }

    window.addEventListener('scroll', updateFloatingButtons);
    window.addEventListener('load', updateFloatingButtons);
    updateFloatingButtons();

    if (backToTopButton) {
        // Scroll suave al hacer clic
        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

function initHeroSlider() {
    const slider = document.querySelector('[data-hero-slider]');
    if (!slider) return;

    const track = slider.querySelector('.hero-track');
    const slides = Array.from(slider.querySelectorAll('.hero-slide'));
    const dots = Array.from(slider.querySelectorAll('.hero-dot'));
    const prevButton = slider.querySelector('.hero-control.prev');
    const nextButton = slider.querySelector('.hero-control.next');

    if (!track || slides.length <= 1) {
        if (prevButton) prevButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';

        const indicators = slider.querySelector('.hero-indicators');
        if (indicators) indicators.style.display = 'none';
        return;
    }

    const AUTO_PLAY_DELAY = 5000;
    let currentIndex = 0;
    let autoPlayTimer = null;

    const updateSlider = (nextIndex) => {
        currentIndex = (nextIndex + slides.length) % slides.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === currentIndex);
        });

        dots.forEach((dot, index) => {
            const isActive = index === currentIndex;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    };

    const goNext = () => updateSlider(currentIndex + 1);
    const goPrev = () => updateSlider(currentIndex - 1);

    const stopAutoplay = () => {
        if (!autoPlayTimer) return;
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    };

    const startAutoplay = () => {
        if (autoPlayTimer) return;
        autoPlayTimer = setInterval(goNext, AUTO_PLAY_DELAY);
    };

    const restartAutoplay = () => {
        stopAutoplay();
        startAutoplay();
    };

    if (prevButton) {
        prevButton.addEventListener('click', function() {
            goPrev();
            restartAutoplay();
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', function() {
            goNext();
            restartAutoplay();
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            updateSlider(index);
            restartAutoplay();
        });
    });

    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);
    slider.addEventListener('focusin', stopAutoplay);
    slider.addEventListener('focusout', function() {
        if (!slider.contains(document.activeElement)) {
            startAutoplay();
        }
    });

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });

    updateSlider(0);
    startAutoplay();
}

