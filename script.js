const byId = (id) => document.getElementById(id);

const $signUpButton = byId("signUp");
const $signInButton = byId("signIn");
const $container = byId("container");

// Inscription
document.querySelector(".sign-up-container form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = e.target.name.value.trim();
  const email = e.target.email.value.trim();
  const password = e.target.password.value.trim();

  if (!name || !email || !password) {
    alert("Tous les champs sont requis !");
    return;
  }

  try {
    const response = await fetch("https://chasse-au-tresor-e05bf79259e7.herokuapp.com/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);

      // Met à jour l'ID utilisateur dans localStorage
      localStorage.setItem("userId", data.userId);

      // Redirige vers la page de jeu ou une autre page
      window.location.href = "accueil.html";
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    alert("Erreur de connexion au serveur.");
  }
});

// Connexion
document.querySelector(".sign-in-container form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = e.target.email.value.trim();
  const password = e.target.password.value.trim();

  // Vérifier que les champs ne sont pas vides
  if (!email || !password) {
    alert("Tous les champs sont requis !");
    return;
  }

  try {
    // Récupère le paramètre de redirection si présent dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get("redirect") || "accueil.html";

    // Effectuer la requête de connexion
    const response = await fetch("https://chasse-au-tresor-e05bf79259e7.herokuapp.com/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);

      // Stocker l'ID utilisateur dans localStorage
      localStorage.setItem("userId", data.userId);

      // Rediriger vers la page ou URL indiquée dans le paramètre `redirect`
      window.location.href = redirectUrl;
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    alert("Erreur de connexion au serveur.");
  }
});

// Transition entre les panneaux
$signUpButton.addEventListener("click", () => {
  $container.classList.add("right-panel-active");
});

$signInButton.addEventListener("click", () => {
  $container.classList.remove("right-panel-active");
});
