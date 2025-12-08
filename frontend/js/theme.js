// Theme toggle functionality
const darkModeToggle = document.getElementById('dark-mode-toggle-input');
const body = document.body;

// Check for saved theme preference or respect OS preference
const savedTheme = localStorage.getItem('theme');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

const applyTheme = (isDark) => {
    if (isDark) {
        body.classList.add('dark');
        body.classList.remove('light');
    } else {
        body.classList.add('light');
        body.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

// Set initial state
let initialIsDark = false;
if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
    initialIsDark = true;
}
darkModeToggle.checked = initialIsDark;
applyTheme(initialIsDark);

darkModeToggle.addEventListener('change', () => {
    applyTheme(darkModeToggle.checked);
});
