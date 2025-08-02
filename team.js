const BASE_URL = "https://chasse-au-tresor-e05bf79259e7.herokuapp.com";

document.addEventListener("DOMContentLoaded", async () => {
  const teamId = localStorage.getItem("teamId");

  try {
    // Récupérer les informations de l'équipe
    const teamResponse = await fetch(`${BASE_URL}/team/${teamId}`);
    const teamData = await teamResponse.json();

    if (teamResponse.ok) {
      document.getElementById("team-name").textContent = `Équipe : ${teamData.team.name}`;
      document.getElementById("team-status").textContent = teamData.team.chasse
        ? `Participe à la chasse : ${teamData.team.chasse.name}`
        : "Ne participe à aucune chasse.";
      document.getElementById("team-progression").textContent = `Progression : ${teamData.team.progression}%`;

      const membersList = document.getElementById("team-members");
      teamData.team.members.forEach((member) => {
        const li = document.createElement("li");
        li.textContent = member.name;
        membersList.appendChild(li);
      });

      // Afficher le bouton Commencer/Reprendre si l'équipe participe à une chasse
      if (teamData.team.chasse) {
        document.getElementById("start-game").style.display = "block";
      }
    }

    // Récupérer les chasses disponibles
    const chassesResponse = await fetch(`${BASE_URL}/chasses`);
    const chassesData = await chassesResponse.json();

    if (chassesResponse.ok) {
      const chassesList = document.getElementById("chasses-list");
      chassesData.chasses.forEach((chasse) => {
        const li = document.createElement("li");
        li.innerHTML = `
          ${chasse.name} 
          <button onclick="joinChasse('${chasse._id}')">Rejoindre</button>
        `;
        chassesList.appendChild(li);
      });
    }
  } catch (error) {
    console.error("Erreur :", error);
  }
});

async function joinChasse(chasseId) {
  const teamId = localStorage.getItem("teamId");

  try {
    const teamResponse = await fetch(`${BASE_URL}/team/${teamId}`);
    const teamData = await teamResponse.json();

    if (teamData.team.chasse) {
      const currentChasseName = teamData.team.chasse.name;

      if (confirm(`Vous participez déjà à la chasse : ${currentChasseName}. Voulez-vous quitter cette chasse pour rejoindre une nouvelle ?`)) {
        // Quitter la chasse actuelle
        await leaveChasse(teamId);

        // Rejoindre la nouvelle chasse
        await sendJoinRequest(chasseId, teamId);
      }
    } else {
      // Rejoindre directement la nouvelle chasse
      await sendJoinRequest(chasseId, teamId);
    }
  } catch (error) {
    console.error("Erreur :", error);
  }
}

async function sendJoinRequest(chasseId, teamId) {
  try {
    const response = await fetch(`${BASE_URL}/team/${teamId}/join-chasse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chasseId }),
    });

    const data = await response.json();
    if (response.ok) {
      alert("Vous avez rejoint la chasse !");
      location.reload(); // Recharge la page pour afficher les nouvelles informations
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Erreur lors de la tentative de rejoindre la chasse :", error);
  }
}

async function leaveChasse(teamId) {
  try {
    const response = await fetch(`${BASE_URL}/team/${teamId}/leave-chasse`, {
      method: "POST",
    });

    const data = await response.json();
    if (response.ok) {
      alert("Vous avez quitté la chasse actuelle.");
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Erreur lors de la tentative de quitter la chasse :", error);
  }
}

document.getElementById("start-game").addEventListener("click", () => {
  window.location.href = "game.html";
});
