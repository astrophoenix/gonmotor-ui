const sidebar = document.getElementById('sidebar');

if (sidebar) {
    const toggleSidebarMobile = (sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose) => {
        sidebar.classList.toggle('hidden');
        sidebarBackdrop.classList.toggle('hidden');
        toggleSidebarMobileHamburger.classList.toggle('hidden');
        toggleSidebarMobileClose.classList.toggle('hidden');
    }
    
    const toggleSidebarMobileEl = document.getElementById('toggleSidebarMobile');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const toggleSidebarMobileHamburger = document.getElementById('toggleSidebarMobileHamburger');
    const toggleSidebarMobileClose = document.getElementById('toggleSidebarMobileClose');
    const toggleSidebarMobileSearch = document.getElementById('toggleSidebarMobileSearch');
    
    toggleSidebarMobileSearch.addEventListener('click', () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose);
    });
    
    toggleSidebarMobileEl.addEventListener('click', () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose);
    });
    
    sidebarBackdrop.addEventListener('click', () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop, toggleSidebarMobileHamburger, toggleSidebarMobileClose);
    });

    // Colapso en desktop (solo iconos)
    const toggleSidebarDesktop = document.getElementById('toggleSidebarDesktop');
    const expandIcon = document.getElementById('toggleSidebarDesktopExpand');
    const collapseIcon = document.getElementById('toggleSidebarDesktopCollapse');

    const applyDesktopCollapse = (collapsed) => {
        document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
        if (expandIcon && collapseIcon) {
            expandIcon.classList.toggle('hidden', !collapsed);
            collapseIcon.classList.toggle('hidden', collapsed);
        }
        localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    };

    if (toggleSidebarDesktop) {
        toggleSidebarDesktop.addEventListener('click', () => {
            const collapsed = !document.documentElement.classList.contains('sidebar-collapsed');
            applyDesktopCollapse(collapsed);
        });
    }

    // Restaurar preferencia guardada
    if (typeof window !== 'undefined' && localStorage.getItem('sidebar-collapsed') === '1') {
        applyDesktopCollapse(true);
    }
}
