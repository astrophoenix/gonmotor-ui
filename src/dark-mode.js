function initializeDarkMode() {
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
    const themeToggleBtn = document.getElementById('theme-toggle');

    if (!themeToggleBtn || !themeToggleDarkIcon || !themeToggleLightIcon) {
        return;
    }

    // Aplicar la preferencia persistida al cargar (el layout arranca con class="dark")
    const oscuro = localStorage.getItem('color-theme') !== 'light';
    document.documentElement.classList.toggle('dark', oscuro);
    if (oscuro) {
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        themeToggleDarkIcon.classList.remove('hidden');
    }

    const event = new Event('dark-mode');

    themeToggleBtn.addEventListener('click', function() {

    // toggle icons
    themeToggleDarkIcon.classList.toggle('hidden');
    themeToggleLightIcon.classList.toggle('hidden');

    // if set via local storage previously
    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        }

    // if NOT set via local storage previously
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }

        document.dispatchEvent(event);
    });
}

initializeDarkMode();
