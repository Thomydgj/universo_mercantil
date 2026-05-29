    const RUNTIME_CONFIG = window.UNIVERSO_CONFIG || {};
    const CONTACT_CONFIG = {
    whatsapp: RUNTIME_CONFIG.whatsapp || "573001234567",
    whatsappMessage: RUNTIME_CONFIG.whatsappMessage || "Hola, quiero cotizar empaques para mi negocio.",
    phoneDisplay: RUNTIME_CONFIG.phoneDisplay || "+57 300 123 4567",
    phoneDial: RUNTIME_CONFIG.phoneDial || "+573001234567"
  };

    const HEADER_TEMPLATE = `
  <div class="header-shell">
    <a class="logo" href="index.html" aria-label="Ir a inicio">
      <span class="logo-image-slot">
        <img class="logo-image" src="assets/logo.webp" alt="Logo Universo Mercantil" loading="eager" decoding="async">
      </span>
      <span class="logo-text-wrap">
        <span class="logo-text">Universo Mercantil S.A.S</span>
        <span class="logo-subtext">Distribuciones</span>
      </span>
    </a>

    <button class="menu-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="site-nav">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <nav id="site-nav" class="nav-bar" aria-label="Navegación principal">
      <ul>
        <li>
          <a href="index.html">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 11l9-8 9 8"/>
              <path d="M5 10v10h14V10"/>
            </svg>
            <span class="nav-label">Inicio</span>
          </a>
        </li>
        <li>
          <a href="categorias.html">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span class="nav-label">Categorías</span>
          </a>
        </li>
        <li>
          <a href="productos.html">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 7l9-4 9 4-9 4-9-4z"/>
              <path d="M3 7v10l9 4 9-4V7"/>
            </svg>
            <span class="nav-label">Productos</span>
          </a>
        </li>
        <li>
          <a href="nosotros.html">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21a8 8 0 0 1 16 0"/>
            </svg>
            <span class="nav-label">Nosotros</span>
          </a>
        </li>
        <li class="nav-item-cta">
          <a href="https://wa.me/573001234567" data-contact-whatsapp target="_blank" rel="noopener noreferrer" aria-label="Cotizar por WhatsApp">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 2 11 13"/>
              <path d="M22 2 15 22 11 13 2 9z"/>
            </svg>
            <span class="nav-label">Cotizar</span>
          </a>
        </li>
        <li class="nav-item-cart">
          <a href="carrito.html" aria-label="Carrito">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="9" cy="20" r="1.7"/>
              <circle cx="18" cy="20" r="1.7"/>
              <path d="M2.5 3h2l2.1 11h11.2l2-8H6"/>
            </svg>
            <span class="nav-label">Carrito</span>
          </a>
        </li>
      </ul>
    </nav>
  </div>
  `;

    function sanitizeFragmentHtml(rawHtml) {
    const preCleanedHtml = rawHtml
      .replace(/<!--\s*Code injected by live-server\s*-->[\s\S]*?<\/script>/gi, "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

    const parser = new DOMParser();
    const doc = parser.parseFromString(preCleanedHtml, "text/html");

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
    const commentsToRemove = [];
    while (walker.nextNode()) {
      commentsToRemove.push(walker.currentNode);
    }
    commentsToRemove.forEach(node => node.remove());

    return doc.body.innerHTML;
  }

  async function loadComponent(id, file) {
    try {
      if (id === "header") {
        document.getElementById(id).innerHTML = HEADER_TEMPLATE;
        return;
      }

      const response = await fetch(file, { cache: "no-store" });
      if (!response.ok) throw new Error(`Error al cargar ${file}`);
      const html = await response.text();
      const sanitizedHtml = sanitizeFragmentHtml(html);
      document.getElementById(id).innerHTML = sanitizedHtml;
    } catch (error) {
      console.error(error);
    }
  }

  function initHeaderInteractions() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".nav-bar");
    const headerShell = document.querySelector(".header-shell");
    if (!toggle || !nav) return;

    const closeMenu = () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        closeMenu();
      });
    });

    document.addEventListener("click", event => {
      if (!nav.classList.contains("open")) return;
      if (headerShell && headerShell.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024) {
        closeMenu();
      }
    });
  }

  function markActiveNavLink() {
    const currentPath = window.location.pathname || "";
    const links = document.querySelectorAll(".nav-bar a");

    links.forEach(link => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#")) return;

      const normalizedHref = href.replace(/\/$/, "");
      const normalizedPath = currentPath.replace(/\/$/, "");

      if (normalizedHref && normalizedPath.endsWith(normalizedHref)) {
        link.classList.add("active");
      }
    });
  }

  function applyGlobalContactConfig() {
    const whatsappButtons = document.querySelectorAll(".quick-contact-btn.whatsapp, [data-contact-whatsapp]");
    const callButtons = document.querySelectorAll(".quick-contact-btn.call");
    const footerPhoneLinks = document.querySelectorAll(".footer-contacto a[href^='tel:']");
    const phoneDisplayTargets = document.querySelectorAll("[data-contact-phone-display]");
    const whatsappHref = `https://wa.me/${CONTACT_CONFIG.whatsapp}?text=${encodeURIComponent(CONTACT_CONFIG.whatsappMessage)}`;

    whatsappButtons.forEach(link => {
      link.setAttribute("href", whatsappHref);
    });

    callButtons.forEach(link => {
      link.setAttribute("href", `tel:${CONTACT_CONFIG.phoneDial}`);
    });

    footerPhoneLinks.forEach(link => {
      link.setAttribute("href", `tel:${CONTACT_CONFIG.phoneDial}`);
      link.textContent = CONTACT_CONFIG.phoneDisplay;
    });

    phoneDisplayTargets.forEach(node => {
      node.textContent = CONTACT_CONFIG.phoneDisplay;
    });
  }

  function ensureBackToTopButton() {
    let backToTopButton = document.getElementById("backToTop");
    if (backToTopButton) return backToTopButton;

    backToTopButton = document.createElement("button");
    backToTopButton.id = "backToTop";
    backToTopButton.className = "back-to-top";
    backToTopButton.setAttribute("aria-label", "Volver arriba");
    backToTopButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    `;

    document.body.appendChild(backToTopButton);
    return backToTopButton;
  }

  function initFloatingButtons() {
    const quickContactButtons = document.querySelector(".quick-contact");
    const backToTopButton = ensureBackToTopButton();

    if (backToTopButton) {
      backToTopButton.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });
    }

    const toggleVisibility = () => {
      if (window.pageYOffset > 600) {
        if (backToTopButton) {
          backToTopButton.classList.add("visible");
        }

        if (quickContactButtons) {
          quickContactButtons.classList.add("visible");
        }
      } else {
        if (backToTopButton) {
          backToTopButton.classList.remove("visible");
        }

        if (quickContactButtons) {
          quickContactButtons.classList.remove("visible");
        }
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    window.addEventListener("load", toggleVisibility);
    toggleVisibility();
  }

  Promise.all([
    loadComponent("header", "header.html"),
    loadComponent("footer", "footer.html")
  ]).then(() => {
    initHeaderInteractions();
    markActiveNavLink();
    applyGlobalContactConfig();
    initFloatingButtons();
  });
