(function () {
  const AGREED_SHIPPING_ZONE = "Envío a convenir con el cliente";
  const AGREED_SHIPPING_MESSAGE = "Nos contactaremos contigo para convenir el envío según tus necesidades específicas.";

  const state = window.checkoutState || {
    shippingCost: 0,
    shippingZone: AGREED_SHIPPING_ZONE,
    shippingDepartment: "",
    deliveryType: "shipping",
    shippingMessage: AGREED_SHIPPING_MESSAGE
  };

  function emitUpdate() {
    const detail = { ...state };
    document.dispatchEvent(new CustomEvent("shipping:updated", { detail }));
    window.dispatchEvent(new CustomEvent("shipping:updated", { detail }));
  }

  function recalculate() {
    const deliveryType = state.deliveryType === "pickup" ? "pickup" : "shipping";
    state.deliveryType = deliveryType;

    if (deliveryType === "pickup") {
      state.shippingCost = 0;
      state.shippingZone = "Recoger en tienda";
      state.shippingMessage = "";
    } else {
      state.shippingCost = 0;
      state.shippingZone = AGREED_SHIPPING_ZONE;
      state.shippingMessage = AGREED_SHIPPING_MESSAGE;
    }

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

  function setZones() {
    recalculate();
  }

  function getZoneForDepartment() {
    return {
      id: "zona-convenir",
      nombre: AGREED_SHIPPING_ZONE,
      precio: 0
    };
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

  recalculate();
})();
