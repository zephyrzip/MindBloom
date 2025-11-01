document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const navContainer = document.getElementById("navContainer");
  const userDropdown = document.getElementById("user-dropdown");
  const navbar = document.getElementById("navbar");

  // Toggle Hamburger Menu
  hamburgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navContainer.classList.toggle("active");
    navbar.classList.toggle("menu-open");

    // Change hamburger icon
    const icon = hamburgerBtn.querySelector("i");
    if (navContainer.classList.contains("active")) {
      icon.className = "fas fa-times";
    } else {
      icon.className = "fas fa-bars";
    }
  });

  // Close mobile menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!navContainer.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      navContainer.classList.remove("active");
      navbar.classList.remove("menu-open");
      hamburgerBtn.querySelector("i").className = "fas fa-bars";
    }
  });

  // Toggle User Dropdown
  if (userDropdown) {
    const userBtn = userDropdown.querySelector(".user-btn");
    userBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      userDropdown.classList.toggle("active");
    });

    // Close dropdown if clicked outside
    document.addEventListener("click", (e) => {
      if (!userDropdown.contains(e.target)) {
        userDropdown.classList.remove("active");
      }
    });
  }

  // Navbar scroll effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Close mobile menu on link click
  const navLinks = document.querySelectorAll(".header-nav-links a");
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      navContainer.classList.remove("active");
      navbar.classList.remove("menu-open");
      hamburgerBtn.querySelector("i").className = "fas fa-bars";
    });
  });
});

// Demo function to toggle between login/signup and user dropdown
function toggleAuth() {
  const userDropdown = document.getElementById("user-dropdown");
  const authButtons = document.getElementById("auth-buttons");

  if (userDropdown.style.display === "none") {
    userDropdown.style.display = "block";
    authButtons.style.display = "none";
  } else {
    userDropdown.style.display = "none";
    authButtons.style.display = "flex";
  }
}