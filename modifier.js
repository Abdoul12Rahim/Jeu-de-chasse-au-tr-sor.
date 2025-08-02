// URL du backend
const BASE_URL = "https://chasse-au-tresor-e05bf79259e7.herokuapp.com";

// Suppression d'une chasse
document.getElementById("deleteChasseForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const chasseId = document.getElementById("chasseId").value.trim();

  if (!chasseId) {
    alert("Veuillez fournir l'ID de la chasse.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/delete-chasse/${chasseId}`, { method: "DELETE" });

    if (response.ok) {
      alert("Chasse supprimée avec succès.");
    } else {
      const error = await response.json();
      alert("Erreur : " + error.message);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la chasse :", error);
    alert("Erreur de connexion au serveur.");
  }
});

// Suppression d'une équipe
document.getElementById("deleteTeamForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const teamId = document.getElementById("teamId").value.trim();

  if (!teamId) {
    alert("Veuillez fournir l'ID de l'équipe.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/delete-team/${teamId}`, { method: "DELETE" });

    if (response.ok) {
      alert("Équipe supprimée avec succès.");
    } else {
      const error = await response.json();
      alert("Erreur : " + error.message);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipe :", error);
    alert("Erreur de connexion au serveur.");
  }
});

// Suppression d'un utilisateur
document.getElementById("deleteUserForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("userId").value.trim();

  if (!userId) {
    alert("Veuillez fournir l'ID de l'utilisateur.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/delete-user/${userId}`, { method: "DELETE" });

    if (response.ok) {
      alert("Utilisateur supprimé avec succès.");
    } else {
      const error = await response.json();
      alert("Erreur : " + error.message);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur :", error);
    alert("Erreur de connexion au serveur.");
  }
});

// Retirer une équipe d'une chasse
document.getElementById("removeTeamFromChasseForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const teamId = document.getElementById("teamIdRemove").value.trim();

  if (!teamId) {
    alert("Veuillez fournir l'ID de l'équipe.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/remove-team-from-chasse/${teamId}`, { method: "PATCH" });

    if (response.ok) {
      alert("Équipe retirée de la chasse avec succès.");
    } else {
      const error = await response.json();
      alert("Erreur : " + error.message);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipe de la chasse :", error);
    alert("Erreur de connexion au serveur.");
  }
});

// Retirer un utilisateur d'une équipe
document.getElementById("removeUserFromTeamForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const teamId = document.getElementById("teamIdUser").value.trim();
  const userId = document.getElementById("userIdRemove").value.trim();

  if (!teamId || !userId) {
    alert("Veuillez fournir l'ID de l'équipe et de l'utilisateur.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/remove-user-from-team`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, userId }),
    });

    if (response.ok) {
      alert("Utilisateur retiré de l'équipe avec succès.");
    } else {
      const error = await response.json();
      alert("Erreur : " + error.message);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur de l'équipe :", error);
    alert("Erreur de connexion au serveur.");
  }
});
