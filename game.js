const BASE_URL = "https://chasse-au-tresor-e05bf79259e7.herokuapp.com";

// Charger la progression de l'équipe et l'indice actuel
async function loadProgress(teamId) {
  try {
    const response = await fetch(`${BASE_URL}/team/${teamId}/chasse`);
    const data = await response.json();

    if (response.ok) {
      const { progression, indice } = data;

      // Afficher la progression
      document.getElementById("progress-message").textContent = `Progression : ${progression}%`;

      // Afficher l'indice actuel et le lieu
      if (indice) {
        document.getElementById("indice-name").textContent = `Indice à chercher : ${indice.name}`;
        document.getElementById("indice-location").textContent = `Lieu : ${indice.location}`;
      } else {
        // Aucun indice restant (chasse terminée)
        document.getElementById("indice-name").textContent = "Félicitations ! Vous avez terminé la chasse.";
        document.getElementById("indice-location").textContent = "";
      }
    } else {
      displayStatusMessage(data.message || "Erreur lors du chargement de la progression.", "error");
    }
  } catch (error) {
    console.error("Erreur lors du chargement de la progression :", error);
    displayStatusMessage("Impossible de charger les informations. Vérifiez votre connexion.", "error");
  }
}

// Afficher des messages de statut
function displayStatusMessage(message, type) {
  const statusElement = document.getElementById("status-message");
  statusElement.textContent = message;
  statusElement.style.color = type === "success" ? "green" : "red";
}

// Simuler ou détecter le scan d'un QR code
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const teamId = localStorage.getItem("teamId");
    const fakeQRCode = prompt("Simulez un code QR scanné :"); // Simule le QR code scanné
    if (teamId && fakeQRCode) {
      validateCode(teamId, fakeQRCode);
    }
  }
});

// Valider un QR code scanné
async function validateCode(teamId, code) {
  if (!teamId || !code) {
    displayStatusMessage("Informations de l'équipe ou code QR manquant.", "error");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/team/${teamId}/validate-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": localStorage.getItem("userId"),
      },
      body: JSON.stringify({ enteredCode: code }),
    });

    const data = await response.json();

    if (response.ok) {
      displayStatusMessage(data.message || "Code QR validé ! Progression mise à jour.", "success");
      loadProgress(teamId); // Recharger la progression après validation
    } else {
      displayStatusMessage(data.message || "Code QR invalide. Veuillez réessayer.", "error");
    }
  } catch (error) {
    console.error("Erreur lors de la validation du code QR :", error);
    displayStatusMessage("Une erreur est survenue. Veuillez réessayer.", "error");
  }
}

// Charger la progression au démarrage
document.addEventListener("DOMContentLoaded", () => {
  const teamId = localStorage.getItem("teamId");

  if (teamId) {
    loadProgress(teamId);
  } else {
    alert("Aucune équipe trouvée. Veuillez rejoindre ou créer une équipe.");
    window.location.href = "index.html";
  }
});
