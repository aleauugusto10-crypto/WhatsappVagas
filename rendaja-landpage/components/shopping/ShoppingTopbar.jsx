import { useEffect, useState } from "react";

function cleanLocation(city = "", state = "") {
  return {
    city: String(city || "").trim(),
    state: String(state || "").trim().toUpperCase(),
  };
}

export default function ShoppingTopbar({ location, onLocationChange }) {
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [city, setCity] = useState(location?.city || "");
  const [state, setState] = useState(location?.state || "");
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setCity(location?.city || "");
    setState(location?.state || "");
  }, [location]);

  function saveLocation(next) {
    localStorage.setItem("shopping_location", JSON.stringify(next));
    onLocationChange?.(next);
  }

  function saveManualLocation() {
    const next = cleanLocation(city, state);

    if (!next.city || !next.state) {
      alert("Informe cidade e estado.");
      return;
    }

    saveLocation(next);
    setLocationModalOpen(false);
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      alert("Seu navegador não permite localização automática.");
      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const res = await fetch(
            `/api/location/reverse?lat=${latitude}&lng=${longitude}`
          );

          const data = await res.json().catch(() => null);

          if (!res.ok || !data?.city) {
            alert(data?.error || "Não foi possível detectar sua cidade.");
            return;
          }

          const next = cleanLocation(data.city, data.state);

          saveLocation(next);
          setLocationModalOpen(false);
        } catch (err) {
          console.error(err);
          alert("Erro ao detectar localização.");
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
        alert("Permissão de localização negada. Escolha manualmente.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000 * 60 * 10,
      }
    );
  }

  return (
    <>
      <header className="shoppingTopbar">
        <button
          type="button"
          className="shoppingTopbarLocation"
          onClick={() => setLocationModalOpen(true)}
        >
          <span />

          <div>
            <strong>
              {location?.city
                ? `${location.city}${location.state ? `/${location.state}` : ""}`
                : "Definir cidade"}
            </strong>
            <small>Comércio local</small>
          </div>
        </button>

       <a href="/p/compretudo-shop-itabaiana-se" className="shoppingTopbarBrand">
  <img src="/compretudo.shop-logo.png" alt="CompreTudo.shop" />
</a>
<a
  href={`https://wa.me/5579991088490?text=${encodeURIComponent(
    `Quero minha vitrine, como faz?

Minha cidade: ${location?.city || "não informada"}
Estado: ${location?.state || "não informado"}`
  )}`}
  target="_blank"
  rel="noreferrer"
  className="shoppingTopbarCta"
>
  <span>Quero minha vitrine</span>
  <small>Apareça para clientes da sua cidade</small>
</a>
      </header>

      {locationModalOpen && (
        <div className="shoppingLocationOverlay">
          <div className="shoppingLocationModal">
            <button
              type="button"
              className="shoppingLocationClose"
              onClick={() => setLocationModalOpen(false)}
            >
              ×
            </button>

            <span>Localização</span>

            <h2>Escolha sua cidade</h2>

            <p>
              O shopping vai mostrar vitrines, produtos, profissionais, vagas e
              missões da cidade escolhida.
            </p>

            <button
              type="button"
              className="shoppingLocationDetect"
              onClick={detectLocation}
              disabled={detecting}
            >
              {detecting ? "Detectando..." : "Usar minha localização atual"}
            </button>

            <div className="shoppingLocationFields">
              <label>
                Cidade
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Itabaiana"
                />
              </label>

              <label>
                Estado
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="SE"
                  maxLength={2}
                />
              </label>
            </div>

            <button
              type="button"
              className="shoppingLocationSave"
              onClick={saveManualLocation}
            >
              Salvar localização
            </button>
          </div>
        </div>
      )}
    </>
  );
}