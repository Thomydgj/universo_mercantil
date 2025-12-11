// checkout.js
document.addEventListener("DOMContentLoaded", () => {
  const btnPagar = document.querySelector(".btn-pagar");

  if (btnPagar) {
    btnPagar.addEventListener("click", async () => {
      const { calcularTotal, carrito } = window.carritoModule;

      if (!carrito || carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
      }

      const amount_in_cents = calcularTotal() * 100;
      const reference = "orden_" + Date.now();
      const customer_email = document.getElementById("email")?.value || "cliente@ejemplo.com";

      const payload = {
        amount_in_cents,
        currency: "COP",
        reference,
        customer_email,
        name: "Compra en carrito",
        description: `Compra de ${carrito.length} productos`,
        collect_shipping: true,
        single_use: true
      };

      try {
        const res = await fetch("https://8248c749e974.ngrok-free.app/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        const checkoutUrl = data.checkout_url || `https://checkout.wompi.co/l/${data.data.id}`;
        window.location.href = checkoutUrl;
      } catch (err) {
        console.error("Error al crear el Payment Link:", err);
        alert("No se pudo iniciar el pago");
      }
    });
  }
});
