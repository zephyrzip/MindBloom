// Enhanced navigation
        window.addEventListener('scroll', function() {
            const navbar = document.getElementById('navbar');
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = 'none';
            }
        });

        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Initialize animations
        document.addEventListener('DOMContentLoaded', function() {
            const animatedElements = document.querySelectorAll('.feature-card, .stat-item');
            
            animatedElements.forEach((element, index) => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(30px)';
                element.style.transition = `opacity 0.8s ease ${index * 0.15}s, transform 0.8s ease ${index * 0.15}s`;
                observer.observe(element);
            });
        });

        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Dynamic quote rotation
        const quotes = [
            {
                text: "You are braver than you believe, stronger than you seem, and more loved than you'll ever know.",
                author: "A.A. Milne"
            },
            {
                text: "Mental health is not a destination, but a process. It's about how you drive, not where you're going.",
                author: "Noam Shpancer"
            },
            {
                text: "Healing takes time, and asking for help is a courageous step toward recovery.",
                author: "Mariska Hargitay"
            },
            {
                text: "Your current situation is not your final destination. The best is yet to come.",
                author: "Unknown"
            }
        ];

        let currentQuoteIndex = 0;
        const quoteElement = document.querySelector('.quote-large');
        const authorElement = document.querySelector('.quote-author-large');

        function rotateQuotes() {
            quoteElement.style.opacity = '0';
            authorElement.style.opacity = '0';
            
            setTimeout(() => {
                currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
                quoteElement.textContent = `"${quotes[currentQuoteIndex].text}"`;
                authorElement.textContent = `— ${quotes[currentQuoteIndex].author}`;
                
                quoteElement.style.opacity = '1';
                authorElement.style.opacity = '1';
            }, 500);
        }

        // Rotate quotes every 8 seconds
        setInterval(rotateQuotes, 8000);