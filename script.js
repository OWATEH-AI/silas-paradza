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
    let pCurrent  = 0;
    let pTimer    = null;
    const P_INTERVAL = 4000;

    const goToSlide = (index) => {
      pSlides[pCurrent].classList.remove("active");
      pCurrent = (index + pSlides.length) % pSlides.length;
      pSlides[pCurrent].classList.add("active");
    };

    const startAuto = () => {
      clearInterval(pTimer);
      pTimer = setInterval(() => goToSlide(pCurrent + 1), P_INTERVAL);
    };

    // Begin auto-play
    startAuto();
  }

  /* ==========================================================================
     9. NEWS & ARTICLES MODAL POPUP
     ========================================================================== */
  const articlesData = {
    "1": {
      title: "Optimizing Bulk Ore Transit Along the Beira Corridor",
      meta: "June 11, 2026 • Logistics Trends",
      image: "tAEB-79qS_e6Fi4XFrZMIHkbaT-4dI-TTtz_IRHVsqJ06q0TYK2FP-1RIYWBCHS64zCkvdIyDRmc6BUMocLS9GDTJpNLTn7J8EBcvjPTLQw8x5P_AOtEv6W6d2G5Iw1sv62F0CUZ2xvoYL0dZc-dfCHApH_zRn3MYlB2dkkye8I.jpg",
      text: `
        <p>Efficient movement of mineral reserves across the Southern African Development Community (SADC) is a vital economic catalyst. As one of the shortest transport channels linking landlocked Zimbabwe to international maritime markets, the Beira Corridor has seen major operational interest over the past decade.</p>
        <p>Recent infrastructure upgrades at the Port of Beira in Mozambique—coupled with the digitization of customs clearance procedures at key border posts like the Forbes Border Post in Mutare—are systematically decreasing truck turnaround times. Historically, freight operators encountered multi-day clearance lines that compromised logistics predictability and increased cargo security expenses.</p>
        <p>By implementing real-time fleet telematics, automated weighing protocols, and unified border systems, mineral logistics providers can now route bulk ores (such as chrome and gold concentrates) from the Midlands Province directly to Mozambican berths with minimized delays. Silas Paradza's logistics division remains at the forefront of these corridor developments, utilizing progressive transport strategies to provide rapid, secure border crossings and dependable freight timelines for resource partners across the SADC region.</p>
      `
    },
    "2": {
      title: "Zimbabwe's Mineral Value Addition: Future Pathways",
      meta: "May 24, 2026 • Mining & Economy",
      image: "amkZxVC9UYaft_4EB-XXpkKAJFQUAE4xu1ThQYuzY85JOKTB9tQBoBsy920ts3wntI-v3lSUtGtl4IzHEiaynb-7OWDkNtgEq0LAlTJ6BIZ1jOrxUbCPsqHC87Vm-wcDtA4aztchpCpOkil1MChNNDrLwF5C-lsZqfkHU0OPU71xIMm4bn5ZHvc1r2xEH2uK.jpg",
      text: `
        <p>Historically, Africa's resource-rich economies have exported raw minerals, capturing only a fraction of the value chain. In Zimbabwe, the shift toward local mineral processing, smelting, and refining is a key pillar of national economic strategy.</p>
        <p>Establishing domestic smelting facilities to process raw chrome ore into high-grade ferrochrome, and gold refinery hubs to purify gold bullion locally, has a transformative impact. This local value addition significantly increases export prices, generating higher national revenue and fostering industrial growth.</p>
        <p>Beyond macroeconomic indicators, regional value addition creates highly skilled jobs, spurs technological development, and supports local communities in the Midlands Province. Silas Paradza is committed to aligning his mining operations with this national vision, investing in community rehabilitation programs, partnering with local processors, and prioritizing sustainable extraction technologies that prepare raw reserves for high-value domestic refinement.</p>
      `
    },
    "3": {
      title: "Developing Joint Ventures in Resource Sectors",
      meta: "April 12, 2026 • Business Development",
      image: "zSYmzosLcB1m_Vu3QlDLNI_EZxBduWJjRUdfsXWVHKY4u4qQBQ5HAhR83fn-5GBAEKMbmDLBt3OAtAXcTL0RqOagWPbY6Tt4hhYjPKEgrPx9FJpUorM5CtTFP1xt23MUzZRFrMfhL1dlKplnt7db6-dk6A9xP28YmdXjpr1lD7o.jpg",
      text: `
        <p>Developing successful natural resource ventures requires combining capital, specialized machinery, and local operational expertise. For global institutional investors, partnering with experienced local operators is the most effective way to navigate regulatory structures and ensure project viability.</p>
        <p>A key phase in any Zimbabwean mining venture is claim pegging. Staking a mining claim involves surveying, officially pegging the boundaries, and registering the claim with the Ministry of Mines and Mining Development. Silas Paradza's teams handle this critical technical and regulatory step, ensuring legal compliance, community alignment, and secure title acquisition before extraction begins.</p>
        <p>Sustainable joint ventures rely on clear stakeholder alignments, environmental responsibility, and structural transparency. By combining local geological knowledge and pegging expertise with international capital, partnerships can unlock major chrome and gold opportunities in the Midlands, driving regional development and delivering strong returns for investors.</p>
      `
    }
  };

  const articleModal = document.getElementById("article-modal");
  const articleModalClose = document.getElementById("article-modal-close");
  const articleModalOverlay = document.getElementById("article-modal-overlay");

  if (articleModal) {
    const titleEl = document.getElementById("article-modal-title");
    const metaEl = document.getElementById("article-modal-meta");
    const imgEl = document.getElementById("article-modal-image");
    const textEl = document.getElementById("article-modal-text");

    const openArticle = (id) => {
      const article = articlesData[id];
      if (article) {
        titleEl.textContent = article.title;
        metaEl.textContent = article.meta;
        imgEl.src = article.image;
        textEl.innerHTML = article.text;

        articleModal.classList.add("active");
        articleModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden"; // Prevent background scroll
      }
    };

    const closeArticle = () => {
      articleModal.classList.remove("active");
      articleModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = ""; // Restore scroll
    };

    // Attach listeners to all Read Article triggers
    document.querySelectorAll("[data-article]").forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const articleId = trigger.getAttribute("data-article");
        openArticle(articleId);
      });
    });

    // Close triggers
    if (articleModalClose) {
      articleModalClose.addEventListener("click", closeArticle);
    }
    if (articleModalOverlay) {
      articleModalOverlay.addEventListener("click", closeArticle);
    }

    // Esc key close
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && articleModal.classList.contains("active")) {
        closeArticle();
      }
    });
  }

});
