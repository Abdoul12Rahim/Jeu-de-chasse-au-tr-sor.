const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const QRCode = require('qrcode');
// Middleware
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'connextion.html')); // Envoyer connextion.html comme page d'accueil
});

// Connexion à MongoDB Atlas
mongoose
  .connect("mongodb+srv://Pierre:AZERTY@cluster0.aycsk.mongodb.net/usersDB?retryWrites=true&w=majority")
  .then(() => {
    console.log("Connexion à MongoDB Atlas réussie !");
  })
  .catch((err) => {
    console.error("Erreur de connexion à MongoDB Atlas :", err);
  });

// Schéma utilisateur pour MongoDB
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }, // Référence à une équipe
  points: { type: Number, default: 0 }, // 
  indicesFound: { type: Number, default: 0 }, // 
  totalIndices: { type: Number, default: 0 }, // 
});


// Schéma pour les équipes
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  progression: { type: Number, default: 0 },
  chasse: { type: mongoose.Schema.Types.ObjectId, ref: "Chasse", default: null },
  code: { type: String, unique: true, required: true }, // Code unique pour rejoindre l'équipe
});
const chasseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  indices: [
    {
      name: { type: String, required: true },
      location: { type: String, required: true },
      qrCode: { type: String, required: true }, // QR code généré
    },
  ],
  equipes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
});



// Modèles MongoDB
const User = mongoose.model("User", userSchema);
const Chasse = mongoose.model("Chasse", chasseSchema);
const Team = mongoose.model("Team", teamSchema);

//Route pour le formulaire d'inscription
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    console.log("Nouvel utilisateur inscrit :", { name, email });

    // Retourne l'ID utilisateur pour le frontend
    res.status(200).json({ 
      message: "Inscription réussie !",
      userId: newUser._id 
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});


// Route pour le formulaire de connexion
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    console.log("Utilisateur connecté :", { email });

    // Inclure l'ID utilisateur dans la réponse
    res.status(200).json({ 
      message: "Connexion réussie !", 
      userId: user._id 
    });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
app.post("/admin/create-chasse", async (req, res) => {
  const { name, indices } = req.body;

  if (!name || !indices || !Array.isArray(indices)) {
    return res.status(400).json({ message: "Nom de la chasse et indices valides requis." });
  }

  try {
    const indicesWithDetails = await Promise.all(
      indices.map(async (indice, index) => {
        const qrContent = `https://chasse-au-tresor-e05bf79259e7.herokuapp.com/login-with-qr?indiceId=${index}`;
        const qrCode = await QRCode.toDataURL(qrContent);

        return { ...indice, qrCode }; // Inclure le QR code avec le nouveau lien
      })
    );

    const newChasse = new Chasse({ name, indices: indicesWithDetails });
    await newChasse.save();

    res.status(200).json({ message: "Chasse créée avec succès.", chasse: newChasse });
  } catch (error) {
    console.error("Erreur lors de la création de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Route pour créer une équipe
app.post("/admin/create-team", async (req, res) => {
  const { name } = req.body;
  const userId = req.headers['user-id']; // Récupère l'utilisateur qui crée l'équipe

  if (!name) {
    return res.status(400).json({ message: "Nom de l'équipe requis." });
  }

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non connecté." });
  }

  try {
    // Vérifiez si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Générer un code unique à 5 chiffres
    let code;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString(); // Génère un nombre entre 10000 et 99999
    } while (await Team.findOne({ code })); // Assurez-vous que le code est unique

    // Créer une équipe avec le code
    const newTeam = new Team({ name, members: [user._id], chasse: null, code });
    await newTeam.save();

    res.status(200).json({ message: "Équipe créée avec succès.", team: newTeam });
  } catch (error) {
    console.error("Erreur lors de la création de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

app.get("/login-with-qr", async (req, res) => {
  const { indiceId } = req.query;

  // Vérifiez si l'utilisateur est connecté
  if (!req.session || !req.session.userId) {
    // Si non, redirigez vers la page de connexion avec l'indiceId
    return res.redirect(`/connextion.html?redirect=/scan?indiceId=${indiceId}`);
  }

  // Si l'utilisateur est connecté, redirigez directement pour valider l'indice
  return res.redirect(`/scan?indiceId=${indiceId}`);
});

// Route pour ajouter un membre à une équipe.
app.post('/team/:teamId/add-member', async (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (team.members.includes(user._id)) {
      return res.status(400).json({ message: "L'utilisateur est déjà dans cette équipe." });
    }

    team.members.push(user._id);
    await team.save();

    res.status(200).json({ message: "Utilisateur ajouté à l'équipe avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'ajout à l'équipe." });
  }
});
//Route pour récuperer les chasses disponibles.
app.get('/chasses', async (req, res) => {
  try {
    const chasses = await Chasse.find({});
    console.log('Chasses récupérées :', chasses); // Log pour vérifier les données
    if (chasses.length === 0) {
      return res.status(404).json({ message: 'Aucune chasse disponible.' });
    }
    res.status(200).json({ chasses });
  } catch (error) {
    console.error('Erreur lors de la récupération des chasses :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});
//route pour voir les utilisateurs disponibles
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    if (users.length === 0) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé.' });
    }
    res.status(200).json({ users });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});
// Route pour récupérer les équipes
app.get('/teams', async (req, res) => {
  try {
    // Récupérer les équipes avec leurs membres et le code
    const teams = await Team.find({})
      .select('name code members progression') // Inclure les champs `name`, `code`, `members`, et `progression`
      .populate('members', 'name'); // Inclure uniquement le champ `name` des membres

    if (teams.length === 0) {
      return res.status(404).json({ message: 'Aucune équipe disponible.' });
    }

    // Retourner les équipes avec leurs informations
    res.status(200).json({ teams });
  } catch (error) {
    console.error('Erreur lors de la récupération des équipes :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

app.get("/scan", async (req, res) => {
  const { indiceId } = req.query; // Récupère l'ID de l'indice depuis le lien QR code
  const userId = req.headers['user-id']; // Récupère l'utilisateur connecté

  if (!userId) {
    return res.status(401).send("Vous devez être connecté pour scanner un indice.");
  }

  try {
    const user = await User.findById(userId).populate("team");
    if (!user) {
      return res.status(404).send("Utilisateur non trouvé.");
    }

    const team = user.team;
    if (!team) {
      return res.status(400).send("Vous n'appartenez à aucune équipe.");
    }

    const chasse = await Chasse.findById(team.chasse);
    if (!chasse) {
      return res.status(400).send("Votre équipe ne participe à aucune chasse.");
    }

    const indice = chasse.indices[indiceId];
    if (!indice) {
      return res.status(404).send("Indice invalide.");
    }

    // Vérifier si l'indice a déjà été scanné
    if (team.progression > indiceId) {
      return res.status(400).send("Cet indice a déjà été scanné.");
    }

    // Mise à jour de la progression
    team.progression = Math.max(team.progression, indiceId + 1);
    await team.save();

    // Réponse avec le prochain indice ou message de fin
    if (team.progression === chasse.indices.length) {
      return res.send("Félicitations ! Vous avez terminé la chasse.");
    } else {
      const nextIndice = chasse.indices[team.progression];
      return res.send(`Indice suivant : ${nextIndice.name}, Lieu : ${nextIndice.location}`);
    }
  } catch (error) {
    console.error("Erreur lors du scan :", error);
    res.status(500).send("Erreur interne du serveur.");
  }
});

// Route pour rejoindre une équipe avec un code
app.post("/team/join", async (req, res) => {
  const { code } = req.body;
  const userId = req.headers['user-id']; // ID de l'utilisateur qui veut rejoindre

  if (!code) {
    return res.status(400).json({ message: "Code requis pour rejoindre une équipe." });
  }

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non connecté." });
  }

  try {
    const team = await Team.findOne({ code });
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée avec ce code." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (team.members.includes(user._id)) {
      return res.status(400).json({ message: "Vous êtes déjà membre de cette équipe." });
    }

    // Ajouter l'utilisateur à l'équipe
    team.members.push(user._id);
    await team.save();

    res.status(200).json({ message: "Vous avez rejoint l'équipe avec succès.", team });
  } catch (error) {
    console.error("Erreur lors de la tentative de rejoindre une équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Route pour récupérer les informations d'une chasse spécifique
app.get("/team/:teamId", async (req, res) => {
  const { teamId } = req.params;

  try {
    // Récupère l'équipe en question et ses informations
    const team = await Team.findById(teamId).populate({
      path: "chasse",
      select: "name indices", // Sélectionne le nom de la chasse et ses indices
      populate: {
        path: "indices", // Assure que les indices sont bien récupérés
        select: "name location qrCode secretCode", // Inclure QR code et code secret
      },
    });

    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    // Si l'équipe est trouvée, renvoyer les détails
    res.status(200).json({ team });
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//Route pour rejoindre une chasse
app.post("/team/:teamId/join-chasse", async (req, res) => {
  const { teamId } = req.params;
  const { chasseId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    if (team.chasse) {
      return res.status(400).json({ message: "L'équipe participe déjà à une chasse." });
    }

    const chasse = await Chasse.findById(chasseId);
    if (!chasse) {
      return res.status(404).json({ message: "Chasse non trouvée." });
    }

    team.chasse = chasse._id;
    await team.save();

    res.status(200).json({ message: "L'équipe a rejoint la chasse.", team });
  } catch (error) {
    console.error("Erreur lors de la tentative de rejoindre une chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//Route pour quitter une chasse 
app.post("/team/:teamId/leave-chasse", async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    if (!team.chasse) {
      return res.status(400).json({ message: "L'équipe ne participe à aucune chasse." });
    }

    team.chasse = null;
    await team.save();

    res.status(200).json({ message: "L'équipe a quitté la chasse.", team });
  } catch (error) {
    console.error("Erreur lors de la tentative de quitter une chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//Route pour augmenter la progression via un Qr code
app.post("/chasse/:chasseId/scan-qr", async (req, res) => {
  const { chasseId } = req.params;
  const { teamId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    if (!team.chasse || team.chasse.toString() !== chasseId) {
      return res.status(400).json({ message: "L'équipe ne participe pas à cette chasse." });
    }

    team.progression += 10; // Augmente la progression (ajustez selon vos besoins)
    await team.save();

    res.status(200).json({ message: "Progression augmentée.", team });
  } catch (error) {
    console.error("Erreur lors du scan du QR code :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
// Route pour récupérer les informations d'un utilisateur
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    res.status(200).json({
      name: user.name,
      email: user.email,
      totalPoints: user.points || 0, // gestion des ppoints 
      indicesFound: user.indicesFound || 0, // 
      totalIndices: user.totalIndices || 0, // 
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'utilisateur :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//Route pour créer un code qr

app.post("/admin/generate-qr", async (req, res) => {
  const { name, location } = req.body; 

  if (!name || !location) {
    return res.status(400).json({ message: "Nom et lieu requis pour générer un QR code." });
  }

  try {
    const qrContent = `Indice : ${name}, Lieu : ${location}`; // Contenu simplifié
    const qrCode = await QRCode.toDataURL(qrContent); // Génération du QR code

    res.status(200).json({ qrCode });
  } catch (error) {
    console.error("Erreur lors de la génération du QR code :", error);
    res.status(500).json({ message: "Erreur interne lors de la génération du QR code." });
  }
});


//Route pour récuperer les  données de l'équipe d'un utilisateur
app.get("/user/:userId/team", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate("team", "name code members progression");
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (!user.team) {
      return res.status(404).json({ message: "Aucune équipe associée à cet utilisateur." });
    }

    res.status(200).json({
      team: {
        name: user.team.name,
        code: user.team.code, // Inclure le code existant
        progression: user.team.progression,
        members: user.team.members.map((member) => ({
          id: member._id,
          name: member.name,
        })),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});


//Route pour démarrer ou reprendre une chasse

app.get("/team/:teamId/chasse", async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId).populate("chasse");
    if (!team || !team.chasse) {
      return res.status(400).json({ message: "L'équipe ne participe à aucune chasse." });
    }

    const currentIndiceIndex = Math.floor(team.progression / (100 / team.chasse.indices.length));
    const currentIndice = team.chasse.indices[currentIndiceIndex];

    res.status(200).json({
      indice: currentIndice,
      progression: team.progression,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//valider un QR Code
app.post("/team/:teamId/validate-code", async (req, res) => {
  const { teamId } = req.params;
  const { enteredCode } = req.body;

  try {
    const team = await Team.findById(teamId).populate("chasse");
    if (!team || !team.chasse) {
      return res.status(400).json({ message: "L'équipe ne participe à aucune chasse." });
    }

    const currentIndiceIndex = Math.floor(team.progression / (100 / team.chasse.indices.length));
    const currentIndice = team.chasse.indices[currentIndiceIndex];

    if (enteredCode !== currentIndice.uniqueCode) {
      return res.status(400).json({ message: "Code incorrect. Veuillez réessayer." });
    }

    // Passez à l'indice suivant ou terminez la chasse
    team.progression += 100 / team.chasse.indices.length;
    if (team.progression >= 100) {
      team.progression = 100;
      team.chasse = null; // Retirer l'équipe de la chasse
      await team.save();
      return res.status(200).json({ message: "Félicitations ! Vous avez terminé la chasse !" });
    }

    await team.save();
    res.status(200).json({ message: "Code validé. Passez à l'indice suivant.", progression: team.progression });
  } catch (error) {
    console.error("Erreur lors de la validation du code :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//mettre à jour la progression
app.get("/progress/:teamId/:pointId", async (req, res) => {
  const { teamId, pointId } = req.params;

  try {
    // Vérifier si l'utilisateur est connecté
    if (!req.session || !req.session.user) {
      return res.redirect("/login.html"); // Rediriger vers la page de connexion si non connecté
    }

    // Vérifier si l'équipe existe
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).send("Équipe non trouvée.");
    }

    // Vérifier si l'équipe participe à une chasse
    if (!team.currentChasse) {
      return res.status(400).send("Cette équipe ne participe à aucune chasse.");
    }

    // Récupérer la chasse associée
    const chasse = await Chasse.findById(team.currentChasse);
    if (!chasse) {
      return res.status(404).send("Chasse non trouvée.");
    }

    // Vérifier si le point scanné est valide
    const point = chasse.indices.find((indice) => String(indice._id) === pointId);
    if (!point) {
      return res.status(404).send("Point invalide.");
    }

    // Vérifier si ce point a déjà été validé
    if (team.validatedPoints.includes(pointId)) {
      return res.redirect("/game.html"); // Déjà validé, rediriger vers le jeu
    }

    // Ajouter le point à la liste des points validés
    team.validatedPoints.push(pointId);

    // Calculer la progression
    const totalPoints = chasse.indices.length;
    const progress = Math.floor((team.validatedPoints.length / totalPoints) * 100);

    // Mettre à jour la progression de l'équipe
    team.progress = progress;
    await team.save();

    // Si la chasse est terminée, rediriger vers une page de victoire
    if (progress === 100) {
      return res.redirect("/victory.html");
    }

    // Rediriger vers la page de jeu si tout s'est bien passé
    res.redirect("/game.html");
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la progression :", error);
    res.status(500).send("Erreur interne du serveur.");
  }
});
// Route pour générer un QR code
app.post("/admin/generate-qr", async (req, res) => {
  const { name, location, secretCode } = req.body;

  if (!name || !location || !secretCode) {
    return res.status(400).json({ message: "Nom, lieu et code secret requis pour générer un QR code." });
  }

  try {
    const qrContent = `Indice : ${name}, Lieu : ${location}, Code Secret : ${secretCode}`;
    const qrCode = await QRCode.toDataURL(qrContent);

    res.status(200).json({ qrCode });
  } catch (error) {
    console.error("Erreur lors de la génération du QR code :", error);
    res.status(500).json({ message: "Erreur interne lors de la génération du QR code." });
  }
});

// Supprimer une chasse 
app.delete("/admin/delete-chasse/:chasseId", async (req, res) => {
  const { chasseId } = req.params;

  try {
    const deletedChasse = await Chasse.findByIdAndDelete(chasseId);
    if (!deletedChasse) {
      return res.status(404).json({ message: "Chasse non trouvée." });
    }

    res.status(200).json({ message: "Chasse supprimée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//Supprimer une équipe
app.delete("/admin/delete-team/:teamId", async (req, res) => {
  const { teamId } = req.params;

  try {
    const deletedTeam = await Team.findByIdAndDelete(teamId);
    if (!deletedTeam) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    // Mettre à jour les utilisateurs associés
    await User.updateMany({ team: teamId }, { $unset: { team: "" } });

    res.status(200).json({ message: "Équipe supprimée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//Supprimer un utilisateur
app.delete("/admin/delete-user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    res.status(200).json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//Retirer une équipe d'une chasse
app.patch("/admin/remove-team-from-chasse/:teamId", async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    team.chasse = null;
    await team.save();

    res.status(200).json({ message: "Équipe retirée de la chasse avec succès." });
  } catch (error) {
    console.error("Erreur lors du retrait de l'équipe de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//Retirer un utilisateur d'une équipe
app.patch("/admin/remove-user-from-team", async (req, res) => {
  const { teamId, userId } = req.body;

  if (!teamId || !userId) {
    return res.status(400).json({ message: "ID de l'équipe et de l'utilisateur requis." });
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    const userIndex = team.members.indexOf(userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: "Utilisateur non trouvé dans cette équipe." });
    }

    // Retirer l'utilisateur de l'équipe
    team.members.splice(userIndex, 1);
    await team.save();

    // Mettre à jour l'utilisateur pour retirer son lien avec l'équipe
    await User.findByIdAndUpdate(userId, { $unset: { team: "" } });

    res.status(200).json({ message: "Utilisateur retiré de l'équipe avec succès." });
  } catch (error) {
    console.error("Erreur lors du retrait de l'utilisateur de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

app.delete("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Retirer l'utilisateur de son équipe
    const team = await Team.findById(user.team);
    if (team) {
      team.members = team.members.filter(memberId => memberId.toString() !== userId);
      await team.save();
    }

    // Supprimer l'utilisateur
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

app.delete("/chasse/:chasseId", async (req, res) => {
  const { chasseId } = req.params;

  try {
    const chasse = await Chasse.findById(chasseId);
    if (!chasse) {
      return res.status(404).json({ message: "Chasse non trouvée." });
    }

    // Mettre à jour les équipes associées pour qu'elles ne participent plus à cette chasse
    await Team.updateMany(
      { chasse: chasseId },
      { $unset: { chasse: "" } }
    );

    // Supprimer la chasse
    await Chasse.findByIdAndDelete(chasseId);

    res.status(200).json({ message: "Chasse supprimée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

app.delete("/chasse/:chasseId", async (req, res) => {
  const { chasseId } = req.params;

  try {
    const chasse = await Chasse.findById(chasseId);
    if (!chasse) {
      return res.status(404).json({ message: "Chasse non trouvée." });
    }

    // Mettre à jour les équipes associées pour qu'elles ne participent plus à cette chasse
    await Team.updateMany(
      { chasse: chasseId },
      { $unset: { chasse: "" } }
    );

    // Supprimer la chasse
    await Chasse.findByIdAndDelete(chasseId);

    res.status(200).json({ message: "Chasse supprimée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

app.delete("/team/:teamId/remove-member/:userId", async (req, res) => {
  const { teamId, userId } = req.params;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Retirer l'utilisateur de l'équipe
    team.members = team.members.filter(memberId => memberId.toString() !== userId);
    await team.save();

    // Retirer l'équipe de l'utilisateur
    user.team = null;
    await user.save();

    res.status(200).json({ message: "Utilisateur retiré de l'équipe avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
