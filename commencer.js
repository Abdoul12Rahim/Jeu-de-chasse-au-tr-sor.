const BASE_URL = "https://chasse-au-tresor-e05bf79259e7.herokuapp.com";

// Création d'une équipe
document.getElementById("create-button").addEventListener("click", async () => {
  const teamName = document.getElementById("team-name").value.trim();
  const userId = localStorage.getItem("userId");

  if (!teamName) {
    alert("Veuillez entrer un nom pour votre équipe.");
    return;
  }

  if (!userId) {
    alert("Vous devez être connecté pour créer une équipe.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/create-team`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId,
      },
      body: JSON.stringify({ name: teamName }),
    });

    const data = await response.json();

    if (response.ok) {
      // Stocker les informations de l'équipe dans le stockage local
      localStorage.setItem("teamId", data.team._id);
      localStorage.setItem("teamName", data.team.name); // Ajout : Sauvegarde du nom de l'équipe
      localStorage.setItem("teamCode", data.team.code); // Ajout : Sauvegarde du code de l'équipe
      alert(`Équipe créée avec succès : ${data.team.name}. Code d'équipe : ${data.team.code}`);
      window.location.href = "team.html"; // Redirection vers la page team
    } else {
      alert(data.message || "Erreur lors de la création de l'équipe.");
    }
  } catch (error) {
    console.error("Erreur :", error);
    alert("Impossible de se connecter au serveur.");
  }
});

// Rejoindre une équipe
document.getElementById("join-button").addEventListener("click", async () => {
  const teamCode = document.getElementById("team-code").value.trim();
  const userId = localStorage.getItem("userId");

  if (!teamCode) {
    alert("Veuillez entrer un code d'équipe.");
    return;
  }

  if (!userId) {
    alert("Vous devez être connecté pour rejoindre une équipe.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/team/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId,
      },
      body: JSON.stringify({ code: teamCode }),
    });

    const data = await response.json();

    if (response.ok) {
      // Stocker les informations de l'équipe dans le stockage local
      localStorage.setItem("teamId", data.team._id);
      localStorage.setItem("teamName", data.team.name); // Ajout : Sauvegarde du nom de l'équipe
      localStorage.setItem("teamCode", data.team.code); // Ajout : Sauvegarde du code de l'équipe
      alert(`Vous avez rejoint l'équipe : ${data.team.name}`);
      window.location.href = "team.html"; // Redirection vers la page team
    } else {
      alert(data.message || "Erreur lors de la tentative de rejoindre l'équipe.");
    }
  } catch (error) {
    console.error("Erreur :", error);
    alert("Impossible de se connecter au serveur.");
  }
});

// Fonction pour afficher les erreurs
function showError(message) {
  const errorSection = document.getElementById("error-section");
  const errorMessage = document.getElementById("error-message");

  errorSection.style.display = "block";
  errorMessage.textContent = message;
}
