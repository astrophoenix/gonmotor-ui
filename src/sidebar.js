const DESKTOP_QUERY = '(min-width: 64rem)';
const COLLAPSED_KEY = 'sidebar-collapsed';

const sidebar = document.getElementById('sidebar');

if (sidebar) {
    const toggleSidebarMobile = (sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose) => {
        const abierto = sidebar.classList.contains('hidden');
        sidebar.classList.toggle('hidden');
        sidebarBackdrop.classList.toggle('hidden');
        toggleSidebarMobileHamburger.classList.toggle('hidden');
        toggleSidebarMobileClose.classList.toggle('hidden');
        toggleSidebarMobileHamburger.setAttribute('aria-expanded', String(abierto));
        document.getElementById('toggleSidebarMobile').setAttribute('aria-expanded', String(abierto));
    }

    const toggleSidebarMobileEl = document.getElementById('toggleSidebarMobile');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const toggleSidebarMobileHamburger = document.getElementById('toggleSidebarMobileHamburger');
    const toggleSidebarMobileClose = document.getElementById('toggleSidebarMobileClose');
    const toggleSidebarMobileSearch = document.getElementById('toggleSidebarMobileSearch');
    const sidebarCloseMobile = document.getElementById('sidebarCloseMobile');

    toggleSidebarMobileSearch.addEventListener('click', () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose);
    });

    toggleSidebarMobileEl.addEventListener('click', () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose);
    });

    sidebarBackdrop.addEventListener('click', () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose);
    });

    // Cerrar el drawer con su propio botón (móvil)
    if (sidebarCloseMobile) {
        sidebarCloseMobile.addEventListener('click', () => {
            toggleSidebarMobile(sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose);
        });
    }

    // Colapso en desktop (solo iconos)
    const toggleSidebarDesktop = document.getElementById('toggleSidebarDesktop');
    const expandIcon = document.getElementById('toggleSidebarDesktopExpand');
    const collapseIcon = document.getElementById('toggleSidebarDesktopCollapse');
    const desktopMedia = window.matchMedia(DESKTOP_QUERY);

    const applyDesktopCollapse = (collapsed, persist = false) => {
        // En móvil el drawer es siempre completo: la preferencia es solo de desktop.
        const activo = desktopMedia.matches && collapsed;
        document.documentElement.classList.toggle('sidebar-collapsed', activo);
        if (expandIcon && collapseIcon) {
            expandIcon.classList.toggle('hidden', !activo);
            collapseIcon.classList.toggle('hidden', activo);
        }
        if (toggleSidebarDesktop) {
            toggleSidebarDesktop.setAttribute('aria-expanded', String(!activo));
            toggleSidebarDesktop.setAttribute(
                'aria-label',
                activo ? 'Expandir sidebar' : 'Colapsar sidebar'
            );
        }
        if (persist) {
            localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
        }
    };

    if (toggleSidebarDesktop) {
        toggleSidebarDesktop.addEventListener('click', () => {
            const colapsado = !document.documentElement.classList.contains('sidebar-collapsed');
            applyDesktopCollapse(colapsado, true);
        });
    }

    // Restaurar preferencia guardada (ignorada mientras el viewport sea móvil)
    applyDesktopCollapse(localStorage.getItem(COLLAPSED_KEY) === '1');

    // Al cruzar el breakpoint, re-sincronizar sin perder la preferencia guardada
    desktopMedia.addEventListener('change', () => {
        applyDesktopCollapse(localStorage.getItem(COLLAPSED_KEY) === '1');
    });
}
