const departamentoSelect = document.getElementById("departamento");
const ciudadSelect = document.getElementById("ciudad");

if (departamentoSelect && ciudadSelect) {
  function actualizarCiudades(data, departamento) {
    ciudadSelect.innerHTML = "";
    const dep = data.find(d => d.departamento === departamento);
    const ciudades = dep?.ciudades || [];

    ciudades.forEach(ciudad => {
      const option = document.createElement("option");
      option.value = ciudad;
      option.textContent = ciudad;
      ciudadSelect.appendChild(option);
    });
  }

  Promise.all([
    fetch("./scripts/colombia.json", { cache: "no-store" }).then(res => res.json()),
    fetch("./scripts/shipping-zones.json", { cache: "no-store" }).then(res => res.json())
  ])
    .then(([departamentosData, zones]) => {
      if (window.checkoutShipping) {
        window.checkoutShipping.setZones(zones);
      }

      const placeholderDep = document.createElement("option");
      placeholderDep.value = "";
      placeholderDep.textContent = "Selecciona un departamento";
      departamentoSelect.appendChild(placeholderDep);

      departamentosData.forEach(dep => {
        const option = document.createElement("option");
        option.value = dep.departamento;
        option.textContent = dep.departamento;
        departamentoSelect.appendChild(option);
      });

      if (departamentosData.length > 0) {
        const depInicial = departamentoSelect.value || departamentosData[0].departamento;
        departamentoSelect.value = depInicial;
        actualizarCiudades(departamentosData, depInicial);
        if (window.checkoutShipping) {
          window.checkoutShipping.setShippingDepartment(depInicial);
        }
      }

      const onDepartamentoChanged = () => {
        const departamento = departamentoSelect.value;
        actualizarCiudades(departamentosData, departamento);
        if (window.checkoutShipping) {
          window.checkoutShipping.setShippingDepartment(departamento);
        }
      };

      departamentoSelect.addEventListener("change", onDepartamentoChanged);

      window.getShippingZoneForDepartment = departamento => {
        if (!window.checkoutShipping) {
          return { id: "zona-default", nombre: "Zona Nacional", precio: 20000 };
        }
        return window.checkoutShipping.getZoneForDepartment(departamento);
      };

      window.refreshShippingCost = () => {
        if (window.checkoutShipping) {
          window.checkoutShipping.refresh();
        }
      };
    })
    .catch(err => {
      console.error("Error cargando datos de departamentos/envios:", err);
      if (window.checkoutState) {
        window.checkoutState.shippingCost = 0;
        window.checkoutState.shippingZone = "No disponible";
      }
      document.dispatchEvent(new CustomEvent("shipping:updated", { detail: window.checkoutState || {} }));
    });
}
