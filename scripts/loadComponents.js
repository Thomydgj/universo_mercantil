    async function loadComponent(id, file) {
        try {
        const response = await fetch(file);         
            if (!response.ok) throw new Error(`Error al cargar ${file}`);
            const html = await response.text();
            document.getElementById(id).innerHTML = html;
          } catch (error) {
            console.error(error);
          }
    }

        // Renderizar header y footer
        loadComponent("header", "header.html");
        loadComponent("footer", "footer.html");