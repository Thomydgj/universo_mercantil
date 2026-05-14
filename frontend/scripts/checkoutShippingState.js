(function () {
  const FALLBACK_ZONE = { id: "zona-default", nombre: "Zona Nacional", precio: 20000 };

  const state = window.checkoutState || {
    shippingCost: 0,
    shippingZone: "Zona Nacional",
    shippingDepartment: "",
    deliveryType: "shipping"
  };

  let zones = [];
  let zoneMap = new Map();

  function normalizeDepartment(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function buildZoneMap(zoneList) {
    const map = new Map();
    zoneList.forEach(zone => {
      if (!Array.isArray(zone.departamentos)) return;
      zone.departamentos.forEach(dep => {
        const key = normalizeDepartment(dep);
        if (key) map.set(key, zone);
      });
    });
    return map;
  }

  function getDefaultZone() {
    return zones.find(zone => zone.id === "zona-default") || FALLBACK_ZONE;
  }

  function getZoneForDepartment(department) {
    const key = normalizeDepartment(department);
    if (!key) return getDefaultZone();
    return zoneMap.get(key) || getDefaultZone();
  }

  function emitUpdate() {
    const detail = { ...state };
    document.dispatchEvent(new CustomEvent("shipping:updated", { detail }));
    window.dispatchEvent(new CustomEvent("shipping:updated", { detail }));
  }

  function recalculate() {
    const deliveryType = state.deliveryType === "pickup" ? "pickup" : "shipping";
    const zone = getZoneForDepartment(state.shippingDepartment);

    state.deliveryType = deliveryType;
    state.shippingCost = deliveryType === "pickup" ? 0 : (Number(zone.precio) || 0);
    state.shippingZone = deliveryType === "pickup" ? "Recoger en tienda" : zone.nombre;

    emitUpdate();
  }

  function setDeliveryType(type) {
    state.deliveryType = type === "pickup" ? "pickup" : "shipping";
    recalculate();
  }

  function setShippingDepartment(department) {
    state.shippingDepartment = String(department || "");
    recalculate();
  }

  function setZones(zoneList) {
    zones = Array.isArray(zoneList) ? zoneList : [];
    zoneMap = buildZoneMap(zones);
    recalculate();
  }

  function getState() {
    return { ...state };
  }

  function refresh() {
    recalculate();
  }

  window.checkoutState = state;
  window.checkoutShipping = {
    setZones,
    setDeliveryType,
    setShippingDepartment,
    getZoneForDepartment,
    getState,
    refresh
  };
})();
