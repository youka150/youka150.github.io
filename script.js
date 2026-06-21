// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
    // 1. Custom Cursor & Magnetic Effect
    const cursorDot = document.querySelector(".cursor-dot");
    const cursorOutline = document.querySelector(".cursor-outline");
    const magnetics = document.querySelectorAll(".magnetic, .magnetic-card");
    const hoverables = document.querySelectorAll("a, button, .magnetic-card");

    let mouseX = 0;
    let mouseY = 0;
    let outlineX = 0;
    let outlineY = 0;

    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Instant dot movement
        gsap.to(cursorDot, {
            x: mouseX,
            y: mouseY,
            duration: 0.1,
            ease: "power2.out"
        });
    });

    // Smooth outline movement loop
    const renderCursor = () => {
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;

        gsap.set(cursorOutline, {
            x: outlineX,
            y: outlineY
        });

        requestAnimationFrame(renderCursor);
    };
    renderCursor();

    // Hover states for cursor
    hoverables.forEach((el) => {
        el.addEventListener("mouseenter", () => {
            document.body.classList.add("cursor-hover");
        });
        el.addEventListener("mouseleave", () => {
            document.body.classList.remove("cursor-hover");
            gsap.to(cursorDot, { scale: 1, duration: 0.3 });
        });
    });

    // Magnetic elements effect
    magnetics.forEach((magnetic) => {
        magnetic.addEventListener("mousemove", function(e) {
            const bound = this.getBoundingClientRect();
            const strength = this.dataset.strength || 20;
            
            // Calculate center of element
            const cx = bound.left + bound.width / 2;
            const cy = bound.top + bound.height / 2;
            
            // Calculate distance from center
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            
            // Move element slightly towards mouse
            gsap.to(this, {
                x: (dx / bound.width) * strength,
                y: (dy / bound.height) * strength,
                duration: 1,
                ease: "power2.out"
            });
        });

        magnetic.addEventListener("mouseleave", function() {
            gsap.to(this, {
                x: 0,
                y: 0,
                duration: 1,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });

    // 2. Ripple Animation
    const rippleContainers = document.querySelectorAll('.ripple-container');
    
    rippleContainers.forEach(container => {
        container.addEventListener('click', function(e) {
            // Get position of click relative to container
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Create ripple element
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            
            // Set size based on container width to ensure it covers it
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x - size/2}px`;
            ripple.style.top = `${y - size/2}px`;
            
            this.appendChild(ripple);
            
            // Remove after animation completes
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // 3. GSAP Entry Animations
    gsap.registerPlugin(ScrollTrigger);

    // Hero Section Timeline
    const tl = gsap.timeline();
    
    tl.fromTo(".hero-text", 
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: "power4.out" }
    )
    .fromTo(".hero-subtext",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
        "-=0.8"
    )
    .fromTo(".scroll-indicator",
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power2.out" },
        "-=0.5"
    );

    // Scroll Animations for articles
    gsap.utils.toArray('.magnetic-card').forEach((card, i) => {
        gsap.fromTo(card,
            { y: 100, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top bottom-=100",
                    toggleActions: "play none none reverse"
                },
                delay: i * 0.1 // Stagger effect
            }
        );
    });
});