import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const CGF = () => {
  useSEO({
    title: "Conditions Générales de Fonctionnement",
    description: "Conditions générales de fonctionnement de la plateforme ONE WORLD MOROCCO.",
    canonical: "/cgf",
  });
  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />
      <main className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Conditions Générales de Fonctionnement</h1>
        <p className="text-lg text-muted-foreground mb-10">One World Morocco</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Objet du Service</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            La plateforme One World Morocco est un espace numérique de mise en relation mettant en contact des prestataires de services (ci-après les « Affiliés ») et des utilisateurs (ci-après les « Internautes »).
          </p>
          <p className="text-muted-foreground leading-relaxed">
            One World Morocco intervient exclusivement en tant qu'intermédiaire technique et n'est en aucun cas partie aux transactions commerciales effectuées entre les Affiliés et les Internautes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Offre de Lancement : Indexation Gratuite</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Dans le cadre de son lancement, la plateforme propose une offre de bienvenue aux Affiliés :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong>Durée :</strong> Une période de trois (3) mois d'indexation et de visibilité gratuite sur la plateforme à compter de sa mise en ligne officielle.</li>
            <li><strong>Engagement :</strong> Cette période de test est sans engagement immédiat de la part de l'Affilié.</li>
            <li><strong>Suite du Service :</strong> À l'issue de ces 3 mois, un Contrat d'Affiliation formel sera adressé à l'Affilié. Ce contrat détaillera les conditions tarifaires et les modalités de collaboration pour le maintien du référencement. L'Affilié sera libre d'accepter ou de décliner la poursuite du partenariat.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Nature de la Relation (Mise en Relation)</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            L'activité de One World Morocco se limite à la présentation des offres des Affiliés. En conséquence :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>La plateforme n'agit ni comme agence de voyage, ni comme revendeur, ni comme mandataire des parties.</li>
            <li>Le contrat de vente ou de prestation de service est conclu directement entre l'Affilié et l'Internaute (B2C) ou entre deux Affiliés (B2B).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Limitation et Exclusion de Responsabilité</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            One World Morocco décline toute responsabilité concernant :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong>Litiges Commerciaux :</strong> Tout différend relatif à la qualité, la conformité, le prix ou le paiement des prestations fournies par l'Affilié.</li>
            <li><strong>Contenu des Fiches :</strong> L'exactitude des informations (textes, photos, tarifs) fournies par l'Affilié pour son indexation. L'Affilié garantit détenir les droits sur ces contenus.</li>
            <li><strong>Dommages Directs/Indirects :</strong> Tout préjudice résultant d'une relation commerciale nouée via la plateforme (B2B ou B2C).</li>
            <li><strong>Disponibilité :</strong> Les éventuelles interruptions techniques de la plateforme, bien que tout soit mis en œuvre pour assurer un service continu.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Obligations de l'Affilié</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Pendant la période d'indexation gratuite, l'Affilié s'engage à :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Fournir des informations sincères et conformes à la réalité de ses services.</li>
            <li>Respecter les lois et réglementations en vigueur au Maroc relatives à son secteur d'activité.</li>
            <li>Répondre avec professionnalisme aux sollicitations des Internautes issues de la plateforme.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Loi Applicable et Juridiction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Les présentes conditions sont régies par le droit marocain. Tout litige relatif à leur interprétation ou leur exécution sera de la compétence exclusive des tribunaux de Marrakech.
          </p>
        </section>

        <hr className="my-12 border-border" />

        <section className="mb-8">
          <p className="text-muted-foreground leading-relaxed mb-6">
            Voici une proposition de lettre d'accompagnement (ou e-mail) à adresser à vos affiliés à l'issue de leur période d'essai de 3 mois. L'objectif est de transformer cette phase de test gratuite en un partenariat formel et durable.
          </p>

          <h2 className="text-xl font-semibold mb-3">Modèle de Lettre d'Accompagnement - Fin de Période d'Essai</h2>

          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong>Objet :</strong> Prolongation de votre visibilité sur One World Morocco – Contrat d'Affiliation
          </p>

          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Cher Partenaire,</p>

            <p>
              Nous arrivons au terme des trois premiers mois de mise en ligne de la plateforme One World Morocco. Durant cette phase de lancement, nous avons eu le plaisir de mettre en avant vos services et de favoriser votre mise en relation avec une audience ciblée d'internautes et de professionnels.
            </p>

            <p>
              Comme convenu lors de votre indexation initiale, nous entrons désormais dans la phase de pérennisation de notre collaboration. Afin de maintenir votre référencement et de continuer à bénéficier de la visibilité offerte par notre plateforme, nous vous prions de trouver ci-joint votre Contrat d'Affiliation.
            </p>

            <p className="font-semibold text-foreground">Ce que ce contrat vous apporte :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintien de votre indexation privilégiée sur notre portail.</li>
              <li>Accès complet aux outils de mise en relation directe (B2B et B2C).</li>
              <li>Support technique dédié pour la mise à jour de vos offres et contenus.</li>
              <li>Promotion active de vos services auprès de notre communauté de voyageurs et de partenaires.</li>
            </ul>

            <p className="font-semibold text-foreground">Modalités de signature :</p>
            <p>
              Nous vous invitons à prendre connaissance des conditions tarifaires et opérationnelles détaillées dans le document joint. Pour confirmer la poursuite de notre partenariat, merci de nous retourner un exemplaire signé et paraphé par e-mail ou via notre interface de gestion d'ici le [Date de fin de validité de l'offre].
            </p>

            <p>
              Nous vous rappelons que One World Morocco agit exclusivement en tant qu'intermédiaire technique de mise en relation et n'intervient pas dans vos transactions commerciales finales, vous laissant ainsi une totale liberté dans la gestion de vos clients.
            </p>

            <p>
              Nous sommes convaincus que la synergie entre nos services contribuera au rayonnement du tourisme et du commerce au Maroc.
            </p>

            <p>
              Dans l'attente de poursuivre cette aventure à vos côtés, nous restons à votre entière disposition pour toute question relative à ce contrat.
            </p>

            <p>Bien cordialement,</p>
            <p className="font-semibold text-foreground">L'Équipe One World Morocco</p>
          </div>
        </section>

        <hr className="my-12 border-border" />

        <section className="mb-8">
          <p className="text-muted-foreground leading-relaxed mb-3">
            Voici une proposition de Contrat d'Affiliation structuré pour protéger la plateforme One World Morocco tout en formalisant la relation avec vos partenaires (hébergeurs, prestataires, commerçants).
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Ce document est conçu pour être annexé à la lettre d'accompagnement envoyée après les 3 mois de gratuité.
          </p>

          <h2 className="text-2xl font-bold mb-6 text-center">CONTRAT D'AFFILIATION – ONE WORLD MOROCCO</h2>

          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p><strong className="text-foreground">ENTRE LES SOUSSIGNÉS :</strong></p>
            <p>La plateforme One World Morocco, représentée par ses fondateurs (ci-après « la Plateforme »),</p>

            <p><strong className="text-foreground">ET :</strong></p>
            <p>La société / l'établissement : [Nom de l'Affilié]</p>
            <p>Représenté(e) par : [Nom du Responsable]</p>
            <p>Adresse : [Adresse complète]</p>
            <p>(ci-après « l'Affilié »).</p>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 1 : OBJET DU CONTRAT</h3>
            <p>Le présent contrat a pour objet de définir les conditions techniques et commerciales dans lesquelles la Plateforme assure le référencement, l'indexation et la mise en visibilité des services de l'Affilié auprès des Internautes (B2C) et des autres partenaires professionnels (B2B).</p>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 2 : NATURE DE LA PRESTATION (INTERMÉDIATION)</h3>
            <p>L'Affilié reconnaît que One World Morocco intervient exclusivement en tant qu'apporteur d'affaires technologique et prestataire de mise en relation.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>La Plateforme n'intervient pas dans le processus de réservation finale, de facturation ou de prestation de service.</li>
              <li>Le contrat de vente est conclu directement entre l'Affilié et son client (ou partenaire B2B).</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 3 : DURÉE ET PRISE D'EFFET</h3>
            <p>Le présent contrat prend effet à l'issue de la période de gratuité de trois (3) mois, sous réserve de sa signature par l'Affilié. Il est conclu pour une durée de [12 mois / Indéterminée], renouvelable par tacite reconduction, sauf dénonciation par l'une des parties avec un préavis de [30 jours].</p>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 4 : MODALITÉS FINANCIÈRES</h3>
            <p>En contrepartie du service de mise en relation et du maintien de son indexation, l'Affilié s'engage à régler :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Option A (Abonnement) :</strong> Un forfait fixe de [Montant] MAD par [Mois/An].</li>
              <li><strong>Option B (Commission) :</strong> [À définir si vous prélevez un % sur les mises en relation].</li>
              <li><strong>Paiement :</strong> Le règlement s'effectue par [Virement / Chèque / Carte] à réception de facture.</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 5 : EXCLUSION DE RESPONSABILITÉ</h3>
            <p>La responsabilité de One World Morocco ne pourra en aucun cas être engagée pour :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Inexécution contractuelle :</strong> Tout défaut de paiement de l'Internaute ou toute annulation de prestation par l'Affilié.</li>
              <li><strong>Litiges B2B/B2C :</strong> Tout dommage corporel, matériel ou immatériel survenant lors de l'exécution de la prestation vendue via la plateforme.</li>
              <li><strong>Contenus :</strong> Les erreurs ou omissions dans les descriptifs fournis par l'Affilié (tarifs, photos, disponibilités). L'Affilié est seul responsable de la véracité de ses offres.</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 6 : ENGAGEMENTS DE L'AFFILIÉ</h3>
            <p>L'Affilié s'engage à :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintenir un niveau de service conforme aux standards de qualité de One World Morocco.</li>
              <li>Mettre à jour régulièrement ses informations sur la plateforme.</li>
              <li>Garantir qu'il dispose de toutes les autorisations administratives et assurances nécessaires à l'exercice de son activité au Maroc.</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 7 : RÉSILIATION</h3>
            <p>En cas de non-respect par l'une des parties de ses obligations, le contrat pourra être résilié de plein droit après une mise en demeure restée infructueuse pendant 15 jours. La Plateforme se réserve le droit de suspendre l'indexation de l'Affilié en cas de défaut de paiement ou de plaintes récurrentes d'utilisateurs.</p>

            <h3 className="text-lg font-semibold text-foreground pt-4">ARTICLE 8 : DROIT APPLICABLE ET LITIGES</h3>
            <p>Le présent contrat est régi par le droit marocain. À défaut d'accord amiable, tout litige sera porté devant le Tribunal de Commerce de Marrakech.</p>

            <p className="pt-4">Fait à Marrakech, le [Date]</p>
            <p>(En deux exemplaires)</p>

            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-border mt-4">
              <div>
                <p className="font-semibold text-foreground">Pour l'Affilié</p>
                <p className="text-sm">(Signature et cachet)</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Pour One World Morocco</p>
                <p className="text-sm">(Signature)</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="my-12 border-border" />

        <section className="mb-8">
          <p className="text-muted-foreground leading-relaxed mb-3">
            Voici une proposition de Formulaire de Référencement (Check-list) pour vos affiliés. Ce document est essentiel pour collecter les données nécessaires à la création de leur fiche technique tout en garantissant la conformité administrative de chaque prestataire sur One World Morocco.
          </p>

          <h2 className="text-2xl font-bold mb-6 text-center">FORMULAIRE D'INDEXATION - ONE WORLD MOROCCO</h2>
          <p className="text-muted-foreground leading-relaxed mb-6 text-center italic">À compléter et à nous retourner pour l'ouverture de votre fiche partenaire</p>

          <div className="text-muted-foreground leading-relaxed space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. INFORMATIONS ADMINISTRATIVES (OBLIGATOIRE)</h3>
              <p className="mb-3">Conformément à nos conditions de mise en relation, ces données assurent la transparence et la légalité de votre établissement sur notre plateforme.</p>
              <ul className="space-y-2 pl-4">
                <li>Dénomination Sociale (Nom de l'entreprise) : _________________________________</li>
                <li>Enseigne Commerciale (Si différente) : ________________________________________</li>
                <li>Forme Juridique (SARL, Auto-entrepreneur, etc.) : ____________________________</li>
                <li>Identifiant Commun de l'Entreprise (ICE) : _____________________________________</li>
                <li>Numéro d'affiliation à la CNSS : ______________________________________________</li>
                <li>Adresse du siège social : ____________________________________________________</li>
                <li>Ville : _______________________________________________________________________</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. COORDONNÉES DE CONTACT</h3>
              <p className="mb-3">Ces informations seront utilisées par la plateforme pour vous transmettre les demandes de mise en relation.</p>
              <ul className="space-y-2 pl-4">
                <li>Nom du responsable / interlocuteur : _________________________________________</li>
                <li>Téléphone professionnel (Direct) : ____________________________________________</li>
                <li>Adresse E-mail (Pour les réservations/demandes) : ____________________________</li>
                <li>Lien vers votre site web (si disponible) : _____________________________________</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. CONTENU DE VOTRE FICHE (PRÉSENTATION)</h3>
              <p className="mb-3">Ces éléments seront visibles par les Internautes et les autres Affiliés.</p>
              <ul className="space-y-2 pl-4">
                <li>Catégorie d'activité : (ex: Hébergement, Restauration, Transport, Artisanat...)</li>
                <li>Description de vos services (en 3 à 5 lignes) :</li>
                <li>Points forts / Spécificités : (ex: Vue sur l'Atlas, Bio, Accessible PMR...)</li>
                <li>Localisation pour la carte (Coordonnées GPS ou Quartier) : ____________________</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">4. DOCUMENTS À JOINDRE</h3>
              <p className="mb-3">Pour valider votre indexation, merci de nous transmettre par e-mail les pièces suivantes :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copie de l'attestation d'immatriculation à l'ICE.</li>
                <li>Attestation d'affiliation à la CNSS (ou dernier bordereau).</li>
                <li>Logo haute définition (Format PNG ou JPEG).</li>
                <li>3 à 5 photographies professionnelles représentatives de votre établissement ou de vos produits.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">5. DÉCLARATION SUR L'HONNEUR</h3>
              <p>Je soussigné(e), ________________________, agissant en qualité de ________________________, certifie l'exactitude des informations fournies ci-dessus et confirme que l'établissement est en règle vis-à-vis des obligations sociales (CNSS) et fiscales en vigueur au Maroc.</p>
              <div className="mt-4 space-y-2">
                <p>Fait à : _______________ Le : _ / _ / 202___</p>
                <p>Signature et Cachet de l'entreprise :</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 mt-6">
              <p className="font-semibold text-foreground mb-3">Pourquoi inclure l'ICE et la CNSS ?</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Sérieux de la plateforme :</strong> Cela rassure les clients (B2C) et les partenaires (B2B) sur le fait qu'ils traitent avec des professionnels déclarés.</li>
                <li><strong>Responsabilité :</strong> En demandant ces documents, vous prouvez que vous agissez comme un intermédiaire rigoureux, ce qui renforce votre clause de déclinaison de responsabilité.</li>
                <li><strong>Évolution WTUCE :</strong> Pour votre mouvement global, cela garantit que les membres du réseau respectent des standards éthiques et légaux de base.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CGF;
