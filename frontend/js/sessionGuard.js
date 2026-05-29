/**
 * Cierra la sesión al usar el botón Atrás del navegador en páginas protegidas.
 */
(function () {
    history.pushState(null, '', location.href);

    window.addEventListener('popstate', () => {
        localStorage.removeItem('userGymCore');
        window.location.replace('../index.html');
    });

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            localStorage.removeItem('userGymCore');
            window.location.replace('../index.html');
        }
    });
})();
