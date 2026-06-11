/**
 * Silas Paradza Official Website - Main Controller Script
 * Handles: Theme Toggle, Sticky Header, Slideshow, Tabs, Gallery Filters, Custom Lightbox, Form Validation & WhatsApp integration, and GSAP ScrollTrigger animations.
 */

document.addEventListener("DOMContentLoaded", () => {

  /* ==========================================================================
     1. THEME SWITCHER (DARK / LIGHT MODE)
     ========================================================================== */
  const themeToggle = document.getElementById("theme-toggle");
  
  // Determine starting theme
  const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const setTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  };

  // Set initial theme
  setTheme(getPreferredTheme());

  // Listen to toggle button
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      setTheme(newTheme);
    });
  }


  /* ==========================================================================
     2. STICKY HEADER & SCROLL HANDLING
     ========================================================================== */
  const header = document.getElementById("header");
  const navMenu = document.getElementById("nav-menu");
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.querySelectorAll(".header__link");
  const sections = document.querySelectorAll("main > section");

  // Add background glassmorphism when scrolled down
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", !isExpanded);
      navToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });
  }

  // Close mobile menu when a link is clicked
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      if (navMenu && navMenu.classList.contains("active")) {
        navMenu.classList.remove("active");
        navToggle.classList.remove("active");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Active navigation highlight on scroll
  window.addEventListener("scroll", () => {
    let current = "";
    const scrollPos = window.scrollY + header.offsetHeight + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });


  /* ==========================================================================
     3. HERO BACKGROUND SLIDESHOW LOOP
     ========================================================================== */
  const slides = document.querySelectorAll(".hero__slide");
  let currentSlideIndex = 0;
  const slideIntervalTime = 5000; // Switch image every 5 seconds

  const nextSlide = () => {
    if (slides.length <= 1) return;
    
    // Remove active state
    slides[currentSlideIndex].classList.remove("active");
    
    // Increment index
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    
    // Add active state
    slides[currentSlideIndex].classList.add("active");
  };

  if (slides.length > 1) {
    setInterval(nextSlide, slideIntervalTime);
  }


  /* ==========================================================================
     4. LOGISTICS TABS INTERACTION
     ========================================================================== */
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      // Set active nav button
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      // Set active panel
      tabPanels.forEach(panel => {
        panel.classList.remove("active");
        if (panel.getAttribute("id") === `tab-${targetTab}`) {
          panel.classList.add("active");
        }
      });
    });
  });


  /* ==========================================================================
     5. GALLERY FILTERING & CUSTOM LIGHTBOX
     ========================================================================== */
  const filterButtons = document.querySelectorAll(".filter-btn");
  const galleryItems = document.querySelectorAll(".gallery-item");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox ? lightbox.querySelector(".lightbox__img") : null;
  const lightboxClose = lightbox ? lightbox.querySelector(".lightbox__close") : null;
  const lightboxPrev = lightbox ? lightbox.querySelector(".lightbox__prev") : null;
  const lightboxNext = lightbox ? lightbox.querySelector(".lightbox__next") : null;
  const lightboxCaption = lightbox ? lightbox.querySelector(".lightbox__caption") : null;

  let filteredImages = [];
  let currentImageIndex = 0;

  // Filter functionality
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filterValue = btn.getAttribute("data-filter");

      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      galleryItems.forEach(item => {
        const itemCategory = item.getAttribute("data-category");

        if (filterValue === "all" || itemCategory === filterValue) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
      
      // Update filtered list for lightbox cycling
      updateFilteredImages();
    });
  });

  const updateFilteredImages = () => {
    filteredImages = [];
    galleryItems.forEach(item => {
      if (window.getComputedStyle(item).display !== "none") {
        const img = item.querySelector("img");
        if (img) {
          filteredImages.push({
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            caption: item.querySelector("h4")?.textContent || img.getAttribute("alt")
          });
        }
      }
    });
  };

  // Initial call
  updateFilteredImages();

  // Open Lightbox
  galleryItems.forEach(item => {
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      if (!img || !lightbox || !lightboxImg) return;

      // Find index in filteredImages
      const currentSrc = img.getAttribute("src");
      currentImageIndex = filteredImages.findIndex(i => i.src === currentSrc);

      if (currentImageIndex !== -1) {
        showLightboxImage(currentImageIndex);
      }
    });
  });

  const showLightboxImage = (index) => {
    if (!lightboxImg || !lightbox) return;
    const imageData = filteredImages[index];
    
    lightboxImg.setAttribute("src", imageData.src);
    lightboxImg.setAttribute("alt", imageData.alt);
    if (lightboxCaption) {
      lightboxCaption.textContent = imageData.caption;
    }
    
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // Prevent scrolling
  };

  // Close Lightbox
  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // Re-enable scrolling
  };

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Prev & Next handlers
  const prevImage = () => {
    if (filteredImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + filteredImages.length) % filteredImages.length;
    showLightboxImage(currentImageIndex);
  };

  const nextImage = () => {
    if (filteredImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % filteredImages.length;
    showLightboxImage(currentImageIndex);
  };

  if (lightboxPrev) lightboxPrev.addEventListener("click", prevImage);
  if (lightboxNext) lightboxNext.addEventListener("click", nextImage);

  // Keyboard accessibility
  document.addEventListener("keydown", (e) => {
    if (lightbox && lightbox.classList.contains("active")) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    }
  });


  /* ==========================================================================
     6. FORM VALIDATION & WHATSAPP REDIRECT (Forms Skill Rule 3 + 4)
     ========================================================================== */
  const contactForm = document.getElementById("contact-form");
  const formSuccess = document.getElementById("form-success");

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      let isValid = true;

      // Reset error styles
      contactForm.querySelectorAll(".form-error").forEach(el => el.textContent = "");
      contactForm.querySelectorAll(".form-input, .form-textarea").forEach(el => el.classList.remove("error"));
      if (formSuccess) formSuccess.hidden = true;

      // Validate required inputs
      const requiredInputs = contactForm.querySelectorAll("[required]");
      requiredInputs.forEach(input => {
        if (!input.value.trim()) {
          input.classList.add("error");
          isValid = false;
          
          const errorSpan = document.getElementById(`${input.id}-error`);
          if (errorSpan) {
            const labelText = input.closest(".form-group").querySelector(".form-label").textContent.replace("*", "").trim();
            errorSpan.textContent = `❌ ${labelText} is required.`;
          }
        }
      });

      // Validate Email (if filled)
      const emailInput = document.getElementById("email");
      if (emailInput && emailInput.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
          emailInput.classList.add("error");
          isValid = false;
          const emailError = document.getElementById("email-error");
          if (emailError) {
            emailError.textContent = "❌ Please enter a valid email address.";
          }
        }
      }

      if (!isValid) return;

      // Form is valid: Format message for WhatsApp Submission
      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const email = emailInput ? emailInput.value.trim() : "Not provided";
      const company = document.getElementById("company") ? document.getElementById("company").value.trim() || "Not provided" : "Not provided";
      const service = document.getElementById("service").value;
      const message = document.getElementById("message").value.trim();

      // Mapping select value to label
      const serviceLabels = {
        general: "General Business Inquiry",
        mining: "Mining Concessions & Operations",
        haulage: "Bulk Logistics & Haulage",
        equipment: "Machinery & Equipment Rental",
        consultation: "Strategic Venture Partnership"
      };

      const selectedServiceLabel = serviceLabels[service] || service;

      // WhatsApp format template
      const templateText = `*NEW WEBSITE INQUIRY*
----------------------------
*Name:* ${name}
*Phone:* ${phone}
*Email:* ${email}
*Company:* ${company}
*Topic:* ${selectedServiceLabel}

*Message:*
${message}`;

      const encodedMessage = encodeURIComponent(templateText);
      const whatsappUrl = `https://wa.me/27783396385?text=${encodedMessage}`;

      // Show success notification banner
      if (formSuccess) {
        formSuccess.hidden = false;
      }

      // Submit Button Loading State
      const submitBtn = document.getElementById("submit-btn");
      if (submitBtn) {
        submitBtn.textContent = "Redirecting...";
        submitBtn.disabled = true;
      }

      // Wait 1.5s then redirect to WhatsApp
      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
        contactForm.reset();
        if (submitBtn) {
          submitBtn.textContent = "Send Message";
          submitBtn.disabled = false;
        }
        if (formSuccess) {
          formSuccess.hidden = true;
        }
      }, 1500);
    });
  }


  /* ==========================================================================
     7. GSAP + SCROLLTRIGGER REVEAL ANIMATIONS
     ========================================================================== */
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    // Fade-in sections reveals
    const revealElements = document.querySelectorAll(".reveal");
    
    revealElements.forEach(element => {
      gsap.fromTo(element, 
        { 
          opacity: 0, 
          y: 35 
        }, 
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 85%", // Animation starts when element top enters 85% of screen height
            toggleActions: "play none none none"
          }
        }
      );
    });

    // Custom Parallax for About Image decorative box
    const goldBox = document.querySelector(".portrait-gold-box");
    if (goldBox) {
      gsap.to(goldBox, {
        y: -30,
        x: 10,
        scrollTrigger: {
          trigger: ".about",
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      });
    }

    // Stagger entrance for why partner cards
    const whyCards = document.querySelectorAll(".why-card");
    if (whyCards.length > 0) {
      gsap.fromTo(whyCards,
        { scale: 0.95, opacity: 0, y: 20 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".why-us-section",
            start: "top 80%",
            toggleActions: "play none none none"
          },
          onComplete: () => {
            // Safety: ensure all cards are fully visible after animation
            whyCards.forEach(card => { card.style.opacity = "1"; card.style.transform = "none"; });
          }
        }
      );
    }

    // Custom fade left-right for division grids
    const opVisual = document.querySelector(".operations-visual");
    const opDetails = document.querySelector(".operations-details");
    
    if (opVisual && opDetails) {
      gsap.from(opVisual, {
        x: -40,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: ".mining-section",
          start: "top 75%"
        }
      });
      gsap.from(opDetails, {
        x: 40,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: ".mining-section",
          start: "top 75%"
        }
      });
    }
  } else {
    // Fallback: Apply active visual styling in case CDN fails to load
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  }



  /* ==========================================================================
     8. ABOUT SECTION PORTRAIT SLIDESHOW
     ========================================================================== */
  const portraitSlideshow = document.getElementById("portrait-slideshow");

  if (portraitSlideshow) {
    const pSlides = portraitSlideshow.querySelectorAll(".portrait-slide");
    const pDots   = portraitSlideshow.querySelectorAll(".portrait-dot");
    let pCurrent  = 0;
    let pTimer    = null;
    const P_INTERVAL = 4000;

    const goToSlide = (index) => {
      pSlides[pCurrent].classList.remove("active");
      pDots[pCurrent].classList.remove("active");
      pCurrent = (index + pSlides.length) % pSlides.length;
      pSlides[pCurrent].classList.add("active");
      pDots[pCurrent].classList.add("active");
    };

    const startAuto = () => {
      clearInterval(pTimer);
      pTimer = setInterval(() => goToSlide(pCurrent + 1), P_INTERVAL);
    };

    // Dot clicks
    pDots.forEach((dot, i) => {
      dot.addEventListener("click", () => { goToSlide(i); startAuto(); });
    });

    // Begin auto-play
    startAuto();
  }

});
