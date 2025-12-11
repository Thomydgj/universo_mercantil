const departamentoSelect = document.getElementById("departamento");
const ciudadSelect = document.getElementById("ciudad");

fetch("./scripts/colombia.json")
  .then(res => res.json())
  .then(data => {
    // Llenar departamentos
    data.forEach(dep => {
      const option = document.createElement("option");
      option.value = dep.departamento;
      option.textContent = dep.departamento;
      departamentoSelect.appendChild(option);
    });

    // Inicializar ciudades con el primer departamento
    if (data.length > 0) {
      const depInicial = data[0];
      depInicial.ciudades.forEach(ciudad => {
        const option = document.createElement("option");
        option.value = ciudad;
        option.textContent = ciudad;
        ciudadSelect.appendChild(option);
      });
    }

    // Al cambiar departamento, actualizar ciudades
    departamentoSelect.addEventListener("change", () => {
      ciudadSelect.innerHTML = "";
      const dep = data.find(d => d.departamento === departamentoSelect.value);
      dep.ciudades.forEach(ciudad => {
        const option = document.createElement("option");
        option.value = ciudad;
        option.textContent = ciudad;
        ciudadSelect.appendChild(option);
      });
    });
  })
  .catch(err => console.error("Error cargando JSON:", err));
