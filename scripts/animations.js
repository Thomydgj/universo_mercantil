// Animación para contador de estadísticas
document.addEventListener('DOMContentLoaded', function() {
    
    // Intersection Observer para detectar cuando la sección es visible
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
    
    // Smooth scroll para los enlaces de navegación
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
    
    // Botón "Volver Arriba" y accesos rápidos de contacto
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
