const formatter = new Intl.NumberFormat("fr-FR");
const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const menuButton = document.querySelector("[data-menu-button]");
const railLinks = document.querySelectorAll(".rail-nav a");
const volumeInput = document.querySelector("[data-volume]");
const rateInput = document.querySelector("[data-rate]");
const volumeOutput = document.querySelector("[data-volume-output]");
const rateOutput = document.querySelector("[data-rate-output]");
const totalOutput = document.querySelector("[data-total]");
const heroNights = document.querySelector("[data-hero-nights]");
const allocationList = document.querySelector("[data-allocation-list]");
const audienceButtons = document.querySelectorAll("[data-audience]");
const audienceTag = document.querySelector("[data-audience-tag]");
const audienceTitle = document.querySelector("[data-audience-title]");
const audienceCopy = document.querySelector("[data-audience-copy]");
const audienceMetric = document.querySelector("[data-audience-metric]");
const audienceCaption = document.querySelector("[data-audience-caption]");
const partnerForm = document.querySelector("[data-partner-form]");
const formResult = document.querySelector("[data-form-result]");

const allocations = [
  { label: "Jeunesse & éducation", detail: "Écoles, formation, ed-tech", percent: 30, color: "#007f75" },
  { label: "Énergie & infrastructures", detail: "Solaire, transport, équipements", percent: 25, color: "#d79a2b" },
  { label: "Patrimoine & nature", detail: "Médinas, biodiversité, restauration", percent: 20, color: "#315f91" },
  { label: "Inclusion sociale", detail: "Aide sociale, coopératives, accès", percent: 15, color: "#b83d46" },
  { label: "Innovation & recherche", detail: "Startups, R&D, mesure d'impact", percent: 10, color: "#5f8d52" },
];

const audiences = {
  hotel: {
    tag: "Partenaire hôtelier",
    title: "Transformer chaque nuitée en preuve d’engagement.",
    copy:
      "Activez la contribution à la réservation, affichez un badge d’impact, puis recevez un reporting mensuel prêt pour vos clients, équipes et partenaires.",
    metric: "+50 000 €",
    caption: "contribution mensuelle sur un pilote de 62 500 nuitées",
  },
  ota: {
    tag: "Plateforme de réservation",
    title: "Intégrer une contribution mondiale sans friction.",
    copy:
      "Connectez le mécanisme à vos flux de réservation, consolidez la collecte par marché et publiez un reporting ESG exploitable à l’échelle internationale.",
    metric: "+1,2 M€",
    caption: "projection annuelle sur une intégration OTA régionale",
  },
  institution: {
    tag: "Institution & mécène",
    title: "Structurer une finance solidaire souveraine et transparente.",
    copy:
      "Suivez les flux, validez les allocations, publiez les audits et donnez au Maroc une vitrine crédible de gouvernance humanitaire.",
    metric: "5 fonds",
    caption: "axes publics avec audit, budget et preuve terrain",
  },
  marketplace: {
    tag: "Commerce solidaire",
    title: "Relier artisans, marques et achats responsables à l’impact.",
    copy:
      "Chaque produit peut afficher son origine, son bénéficiaire, sa contribution et son récit de preuve pour faire grandir One World Morocco.",
    metric: "1 € à 5 €",
    caption: "contribution visible par transaction responsable",
  },
};

function updateCalculator() {
  const volume = Number(volumeInput.value);
  const rate = Number(rateInput.value);
  const total = Math.round((volume * rate) / 100);

  volumeOutput.value = formatter.format(volume);
  rateOutput.value = `${formatter.format(rate)}%`;
  totalOutput.textContent = currency.format(total);
  heroNights.textContent = formatter.format(total);

  allocationList.innerHTML = allocations
    .map((item) => {
      const amount = Math.round((total * item.percent) / 100);

      return `
        <article class="allocation-row">
          <div>
            <strong>${item.label}</strong>
            <small>${item.detail}</small>
          </div>
          <span class="bar" aria-hidden="true">
            <span style="width: ${item.percent}%; --bar-color: ${item.color}"></span>
          </span>
          <em>${currency.format(amount)}</em>
        </article>
      `;
    })
    .join("");
}

function setAudience(key) {
  const audience = audiences[key];

  audienceButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.audience === key);
  });

  audienceTag.textContent = audience.tag;
  audienceTitle.textContent = audience.title;
  audienceCopy.textContent = audience.copy;
  audienceMetric.textContent = audience.metric;
  audienceCaption.textContent = audience.caption;
}

menuButton.addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

railLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
  });
});

audienceButtons.forEach((button) => {
  button.addEventListener("click", () => setAudience(button.dataset.audience));
});

volumeInput.addEventListener("input", updateCalculator);
rateInput.addEventListener("input", updateCalculator);

partnerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(partnerForm);
  const organisation = String(data.get("organisation") || "Votre organisation").trim();
  const type = String(data.get("type") || "Partenaire").trim();
  const volume = Math.max(0, Number(data.get("volume") || 0));

  formResult.textContent = `${organisation} (${type}) peut entrer en pilote avec une contribution estimée à ${currency.format(
    volume,
  )} par mois, un badge d’impact et un reporting public.`;
});

updateCalculator();
