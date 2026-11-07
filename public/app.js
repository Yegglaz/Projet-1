const C = window.CONFIG || {};
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} } };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "i" + (h >>> 0).toString(36); };

/* ===== 1. Langues (fr, en, de, es complets ; it, pt : interface principale, le reste en anglais) ===== */
const LOC = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", pt: "pt-PT" };
const L = {
fr: { nh: "Accueil", nt: "Du jour", ns: "Recherche", nl: "Bibliothèque", sub: "De nouveaux documentaires à découvrir, chaque jour.", cnt: "{n} documentaires et articles à découvrir", hi: "Bonjour", ev: "Bonsoir", sD: "Documentaires à regarder", sN: "Nouveautés de vos sujets", sF: "Pour vous", sW: "Documentaires écrits", td: "Aujourd'hui", pv: "Les jours précédents", sh: "Recherche", sph: "Documentaires, sujets, auteurs…", cA: "Tout", cD: "Documentaires", cW: "Écrits", cC: "Archives & clips", cS: "Sous-titrés", cats: "Catégories", more: "Afficher plus", none: "Aucun résultat.", r1: "{n} résultat", rN: "{n} résultats", lh: "Bibliothèque", lt: "Sujets suivis", ll: "Mes coups de cœur", le: "Appuyez sur ♥ dans un documentaire pour le retrouver ici.", f1: "Mentions légales", f2: "Confidentialité", f3: "Gérer les cookies", ck: "Nous utilisons des cookies publicitaires pour financer le site.", no: "Refuser", ok: "Accepter", login: "Connexion",
 st: "Paramètres", sAcc: "Compte", sLog: "Connexion / Inscription", sMy: "Mon compte", sLang: "Langue", sLangN: "La langue change l'interface ; les documentaires gardent leur langue d'origine.", sMode: "Mode", mA: "Auto", mL: "Clair", mD: "Sombre", sCol: "Couleur de l'interface", sTxt: "Taille du texte", sVid: "Vidéos", sSub: "Sous-titres français quand disponibles", sMot: "Réduire les animations", sRes: "Réinitialiser", close: "Fermer",
 c0: "Coucher de soleil", c1: "Océan", c2: "Forêt", c3: "Rose", c4: "Ambre", c5: "Ardoise",
 aL: "Connexion", aC: "Créer un compte", aM: "Mon compte", aI: "Retrouvez vos goûts sur tous vos appareils et recevez les nouveautés par email.", aP: "Pseudo (3 à 20 caractères)", aE: "Email", aEo: "Email (facultatif)", aW: "Mot de passe (8 caractères min.)", aO: "Je souhaite recevoir par email les nouveaux documentaires (désinscription en un clic).", aB: "Se connecter", aB2: "Créer mon compte", aH: "J'ai déjà un compte", aLI: "Créez un profil sur cet appareil : vos goûts sont mémorisés. (Les alertes email demandent un compte.)", aLB: "Créer mon profil", aOut: "Se déconnecter", aSp: "Enregistrer le pseudo", aMp: "Mon pseudo", aCo: "Connecté : {n} ({e})", aNo: "Non connecté", aPr: "Profil : {n}", aLoc: "Profil sur cet appareil : {n}",
 eP: "Pseudo : 3 à 20 caractères (lettres, chiffres, _ - . espace).", eCr: "Compte créé. Vérifiez votre email pour le confirmer, puis connectez-vous.", eNc: "La connexion par email n'est pas encore activée sur ce site : il manque l'URL et la clé Supabase dans config.js. En attendant, créez un profil sur cet appareil.", eDw: "Service de connexion momentanément injoignable. Réessayez ou créez un profil sur cet appareil.", eBad: "Email ou mot de passe incorrect.", eCf: "Confirmez d'abord votre email (lien reçu par mail).", eEx: "Ce compte existe déjà : connectez-vous.", eRt: "Trop d'emails envoyés : réessayez plus tard (ou désactivez « Confirm email » dans Supabase).", eKey: "Clé Supabase invalide : vérifiez config.js.", eFe: "Impossible de joindre Supabase : vérifiez config.js.", eSv: "Pseudo enregistré.", eGen: "Erreur de connexion.",
 alOn: "✓ Alertes email activées", alOff: "Recevoir les nouveaux documentaires par email", alNeed: "Alertes email : créez un compte avec votre email pour les recevoir.", alEn: "Activer", alDis: "Désactiver",
 lD: "Documentaire", lA: "Film d'archive", lC: "Clip", lW: "Documentaire écrit", wa: "▶ Regarder", rd: "Lire", dis: "À découvrir : {t}", bf: "Parce que vous suivez « {t} »", bl: "Parce que vous aimez « {t} »",
 bk: "‹ Retour", lk: "♥ J'aime", hd: "✕ Pas intéressé", rel: "À découvrir aussi", ld: "Chargement de l'article complet…", lu: "Lecture complète momentanément indisponible.",
 by: "Par {a}", cv: "Article republié à partir de {s} sous licence Creative Commons (Attribution – Pas de modification). Texte intégral, non modifié.", or: "Article original", wk: "Article issu de Wikipédia, écrit par ses contributeurs, sous licence {l}.", wo: "Article d'origine", wau: "Auteurs", wl: "Licence", wi: "Image : Wikimedia Commons.", ar: "Vidéo hébergée par Internet Archive.", au: "Auteur : {a}.", yt: "Vidéo de {s}, lue depuis YouTube.", dr: "Par la rédaction Docu",
 pl: "Lancer la lecture", ps: "La lecture met du temps à démarrer.", pr: "Réessayer", po: "Ouvrir le lecteur d'origine", pt: "Un souci de lecture ?", sf: "Sous-titres français disponibles (bouton CC du lecteur).", sn: "Pas de sous-titres français pour ce film.", sy: "Sous-titres français demandés. Sinon : roue dentée du lecteur, Sous-titres, Traduire automatiquement.", se: "Sous-titres disponibles en anglais uniquement.", sk: "Recherche des sous-titres…",
 t_espace: "Espace", t_animaux: "Animaux", t_oceans: "Océans", t_climat: "Climat", t_sante: "Santé & cerveau", t_histoire: "Histoire", t_archeo: "Archéologie & fossiles", t_tech: "Technologie", t_physique: "Physique & chimie", t_terre: "Planète Terre" },
en: { nh: "Home", nt: "Today", ns: "Search", nl: "Library", sub: "New documentaries to discover, every day.", cnt: "{n} documentaries and articles to discover", hi: "Good morning", ev: "Good evening", sD: "Documentaries to watch", sN: "New in your topics", sF: "For you", sW: "Written documentaries", td: "Today", pv: "Previous days", sh: "Search", sph: "Documentaries, topics, authors…", cA: "All", cD: "Documentaries", cW: "Written", cC: "Archives & clips", cS: "Subtitled", cats: "Categories", more: "Show more", none: "No results.", r1: "{n} result", rN: "{n} results", lh: "Library", lt: "Followed topics", ll: "My favourites", le: "Tap ♥ on a documentary to find it here.", f1: "Legal notice", f2: "Privacy", f3: "Manage cookies", ck: "We use advertising cookies to fund the site.", no: "Decline", ok: "Accept", login: "Sign in",
 st: "Settings", sAcc: "Account", sLog: "Sign in / Sign up", sMy: "My account", sLang: "Language", sLangN: "Language changes the interface; documentaries keep their original language.", sMode: "Mode", mA: "Auto", mL: "Light", mD: "Dark", sCol: "Interface colour", sTxt: "Text size", sVid: "Videos", sSub: "French subtitles when available", sMot: "Reduce animations", sRes: "Reset", close: "Close",
 c0: "Sunset", c1: "Ocean", c2: "Forest", c3: "Rose", c4: "Amber", c5: "Slate",
 aL: "Sign in", aC: "Create an account", aM: "My account", aI: "Keep your tastes on all your devices and get new releases by email.", aP: "Username (3 to 20 characters)", aE: "Email", aEo: "Email (optional)", aW: "Password (min. 8 characters)", aO: "I want to receive new documentaries by email (unsubscribe in one click).", aB: "Sign in", aB2: "Create my account", aH: "I already have an account", aLI: "Create a profile on this device: your tastes are remembered. (Email alerts need an account.)", aLB: "Create my profile", aOut: "Sign out", aSp: "Save username", aMp: "My username", aCo: "Signed in: {n} ({e})", aNo: "Not signed in", aPr: "Profile: {n}", aLoc: "Profile on this device: {n}",
 eP: "Username: 3 to 20 characters (letters, digits, _ - . space).", eCr: "Account created. Check your email to confirm it, then sign in.", eNc: "Email sign-in is not enabled on this site yet: the Supabase URL and key are missing in config.js. Meanwhile, create a profile on this device.", eDw: "Sign-in service temporarily unreachable. Try again or create a profile on this device.", eBad: "Wrong email or password.", eCf: "Please confirm your email first (link sent by email).", eEx: "This account already exists: sign in.", eRt: "Too many emails sent: try again later (or disable “Confirm email” in Supabase).", eKey: "Invalid Supabase key: check config.js.", eFe: "Cannot reach Supabase: check config.js.", eSv: "Username saved.", eGen: "Sign-in error.",
 alOn: "✓ Email alerts on", alOff: "Get new documentaries by email", alNeed: "Email alerts: create an account with your email to receive them.", alEn: "Enable", alDis: "Disable",
 lD: "Documentary", lA: "Archive film", lC: "Clip", lW: "Written documentary", wa: "▶ Watch", rd: "Read", dis: "Discover: {t}", bf: "Because you follow “{t}”", bl: "Because you like “{t}”",
 bk: "‹ Back", lk: "♥ Like", hd: "✕ Not interested", rel: "You may also like", ld: "Loading the full article…", lu: "Full text temporarily unavailable.",
 by: "By {a}", cv: "Article republished from {s} under a Creative Commons licence (Attribution – No Derivatives). Full text, unmodified.", or: "Original article", wk: "Article from Wikipedia, written by its contributors, licensed {l}.", wo: "Original article", wau: "Authors", wl: "Licence", wi: "Image: Wikimedia Commons.", ar: "Video hosted by Internet Archive.", au: "Author: {a}.", yt: "Video by {s}, played from YouTube.", dr: "By the Docu editorial team",
 pl: "Play", ps: "Playback is slow to start.", pr: "Retry", po: "Open the original player", pt: "Playback problem?", sf: "French subtitles available (player CC button).", sn: "No French subtitles for this film.", sy: "French subtitles requested. If missing: player gear icon, Subtitles, Auto-translate.", se: "Subtitles available in English only.", sk: "Looking for subtitles…",
 t_espace: "Space", t_animaux: "Animals", t_oceans: "Oceans", t_climat: "Climate", t_sante: "Health & brain", t_histoire: "History", t_archeo: "Archaeology & fossils", t_tech: "Technology", t_physique: "Physics & chemistry", t_terre: "Planet Earth" },
de: { nh: "Start", nt: "Heute", ns: "Suche", nl: "Bibliothek", sub: "Jeden Tag neue Dokumentationen entdecken.", cnt: "{n} Dokumentationen und Artikel zu entdecken", hi: "Guten Morgen", ev: "Guten Abend", sD: "Dokumentationen zum Ansehen", sN: "Neu in Ihren Themen", sF: "Für Sie", sW: "Geschriebene Dokumentationen", td: "Heute", pv: "Vorherige Tage", sh: "Suche", sph: "Dokus, Themen, Autoren…", cA: "Alle", cD: "Dokumentationen", cW: "Texte", cC: "Archive & Clips", cS: "Mit Untertiteln", cats: "Kategorien", more: "Mehr anzeigen", none: "Keine Ergebnisse.", r1: "{n} Ergebnis", rN: "{n} Ergebnisse", lh: "Bibliothek", lt: "Verfolgte Themen", ll: "Meine Favoriten", le: "Tippen Sie auf ♥, um eine Doku hier wiederzufinden.", f1: "Impressum", f2: "Datenschutz", f3: "Cookies verwalten", ck: "Wir verwenden Werbe-Cookies zur Finanzierung der Seite.", no: "Ablehnen", ok: "Akzeptieren", login: "Anmelden",
 st: "Einstellungen", sAcc: "Konto", sLog: "Anmelden / Registrieren", sMy: "Mein Konto", sLang: "Sprache", sLangN: "Die Sprache ändert die Oberfläche; Dokus behalten ihre Originalsprache.", sMode: "Modus", mA: "Auto", mL: "Hell", mD: "Dunkel", sCol: "Farbe der Oberfläche", sTxt: "Textgröße", sVid: "Videos", sSub: "Französische Untertitel, wenn verfügbar", sMot: "Animationen reduzieren", sRes: "Zurücksetzen", close: "Schließen",
 c0: "Sonnenuntergang", c1: "Ozean", c2: "Wald", c3: "Rosa", c4: "Bernstein", c5: "Schiefer",
 aL: "Anmelden", aC: "Konto erstellen", aM: "Mein Konto", aI: "Behalten Sie Ihre Vorlieben auf allen Geräten und erhalten Sie Neuheiten per E-Mail.", aP: "Benutzername (3 bis 20 Zeichen)", aE: "E-Mail", aEo: "E-Mail (optional)", aW: "Passwort (mind. 8 Zeichen)", aO: "Ich möchte neue Dokus per E-Mail erhalten (Abmeldung mit einem Klick).", aB: "Anmelden", aB2: "Konto erstellen", aH: "Ich habe schon ein Konto", aLI: "Erstellen Sie ein Profil auf diesem Gerät: Ihre Vorlieben werden gespeichert. (E-Mail-Hinweise brauchen ein Konto.)", aLB: "Profil erstellen", aOut: "Abmelden", aSp: "Benutzernamen speichern", aMp: "Mein Benutzername", aCo: "Angemeldet: {n} ({e})", aNo: "Nicht angemeldet", aPr: "Profil: {n}", aLoc: "Profil auf diesem Gerät: {n}",
 eP: "Benutzername: 3 bis 20 Zeichen (Buchstaben, Ziffern, _ - . Leerzeichen).", eCr: "Konto erstellt. Bestätigen Sie Ihre E-Mail und melden Sie sich dann an.", eNc: "Die E-Mail-Anmeldung ist auf dieser Seite noch nicht aktiviert (Supabase-URL und -Schlüssel fehlen in config.js). Erstellen Sie vorerst ein Profil auf diesem Gerät.", eDw: "Anmeldedienst vorübergehend nicht erreichbar. Bitte erneut versuchen oder ein Profil auf diesem Gerät erstellen.", eBad: "E-Mail oder Passwort falsch.", eCf: "Bitte bestätigen Sie zuerst Ihre E-Mail.", eEx: "Dieses Konto existiert bereits: bitte anmelden.", eRt: "Zu viele E-Mails gesendet: später erneut versuchen.", eKey: "Ungültiger Supabase-Schlüssel: config.js prüfen.", eFe: "Supabase nicht erreichbar: config.js prüfen.", eSv: "Benutzername gespeichert.", eGen: "Anmeldefehler.",
 alOn: "✓ E-Mail-Hinweise aktiv", alOff: "Neue Dokus per E-Mail erhalten", alNeed: "E-Mail-Hinweise: Erstellen Sie ein Konto mit Ihrer E-Mail.", alEn: "Aktivieren", alDis: "Deaktivieren",
 lD: "Dokumentation", lA: "Archivfilm", lC: "Clip", lW: "Geschriebene Doku", wa: "▶ Ansehen", rd: "Lesen", dis: "Entdecken: {t}", bf: "Weil Sie „{t}“ verfolgen", bl: "Weil Ihnen „{t}“ gefällt",
 bk: "‹ Zurück", lk: "♥ Gefällt mir", hd: "✕ Nicht interessant", rel: "Das könnte Sie auch interessieren", ld: "Vollständiger Artikel wird geladen…", lu: "Volltext vorübergehend nicht verfügbar.",
 by: "Von {a}", cv: "Artikel von {s} unter Creative-Commons-Lizenz (Namensnennung – Keine Bearbeitung) erneut veröffentlicht. Volltext, unverändert.", or: "Originalartikel", wk: "Artikel aus Wikipedia, verfasst von seinen Autoren, Lizenz {l}.", wo: "Originalartikel", wau: "Autoren", wl: "Lizenz", wi: "Bild: Wikimedia Commons.", ar: "Video gehostet von Internet Archive.", au: "Autor: {a}.", yt: "Video von {s}, über YouTube abgespielt.", dr: "Von der Docu-Redaktion",
 pl: "Abspielen", ps: "Die Wiedergabe startet langsam.", pr: "Erneut versuchen", po: "Originalplayer öffnen", pt: "Wiedergabeproblem?", sf: "Französische Untertitel verfügbar (CC-Taste im Player).", sn: "Keine französischen Untertitel für diesen Film.", sy: "Französische Untertitel angefordert. Sonst: Zahnrad im Player, Untertitel, Automatisch übersetzen.", se: "Untertitel nur auf Englisch verfügbar.", sk: "Untertitel werden gesucht…",
 t_espace: "Weltraum", t_animaux: "Tiere", t_oceans: "Ozeane", t_climat: "Klima", t_sante: "Gesundheit & Gehirn", t_histoire: "Geschichte", t_archeo: "Archäologie & Fossilien", t_tech: "Technologie", t_physique: "Physik & Chemie", t_terre: "Planet Erde" },
es: { nh: "Inicio", nt: "Hoy", ns: "Buscar", nl: "Biblioteca", sub: "Nuevos documentales para descubrir cada día.", cnt: "{n} documentales y artículos por descubrir", hi: "Buenos días", ev: "Buenas noches", sD: "Documentales para ver", sN: "Novedades de tus temas", sF: "Para ti", sW: "Documentales escritos", td: "Hoy", pv: "Días anteriores", sh: "Buscar", sph: "Documentales, temas, autores…", cA: "Todo", cD: "Documentales", cW: "Escritos", cC: "Archivos y clips", cS: "Con subtítulos", cats: "Categorías", more: "Mostrar más", none: "Sin resultados.", r1: "{n} resultado", rN: "{n} resultados", lh: "Biblioteca", lt: "Temas seguidos", ll: "Mis favoritos", le: "Pulsa ♥ en un documental para encontrarlo aquí.", f1: "Aviso legal", f2: "Privacidad", f3: "Gestionar cookies", ck: "Usamos cookies publicitarias para financiar el sitio.", no: "Rechazar", ok: "Aceptar", login: "Iniciar sesión",
 st: "Ajustes", sAcc: "Cuenta", sLog: "Iniciar sesión / Registrarse", sMy: "Mi cuenta", sLang: "Idioma", sLangN: "El idioma cambia la interfaz; los documentales conservan su idioma original.", sMode: "Modo", mA: "Auto", mL: "Claro", mD: "Oscuro", sCol: "Color de la interfaz", sTxt: "Tamaño del texto", sVid: "Vídeos", sSub: "Subtítulos en francés cuando existan", sMot: "Reducir animaciones", sRes: "Restablecer", close: "Cerrar",
 c0: "Atardecer", c1: "Océano", c2: "Bosque", c3: "Rosa", c4: "Ámbar", c5: "Pizarra",
 aL: "Iniciar sesión", aC: "Crear una cuenta", aM: "Mi cuenta", aI: "Conserva tus gustos en todos tus dispositivos y recibe las novedades por correo.", aP: "Usuario (de 3 a 20 caracteres)", aE: "Correo", aEo: "Correo (opcional)", aW: "Contraseña (mín. 8 caracteres)", aO: "Quiero recibir los nuevos documentales por correo (baja con un clic).", aB: "Iniciar sesión", aB2: "Crear mi cuenta", aH: "Ya tengo una cuenta", aLI: "Crea un perfil en este dispositivo: se recordarán tus gustos. (Las alertas por correo requieren una cuenta.)", aLB: "Crear mi perfil", aOut: "Cerrar sesión", aSp: "Guardar usuario", aMp: "Mi usuario", aCo: "Sesión: {n} ({e})", aNo: "Sin sesión", aPr: "Perfil: {n}", aLoc: "Perfil en este dispositivo: {n}",
 eP: "Usuario: de 3 a 20 caracteres (letras, cifras, _ - . espacio).", eCr: "Cuenta creada. Confirma tu correo y luego inicia sesión.", eNc: "El inicio de sesión por correo aún no está activado en este sitio (faltan la URL y la clave de Supabase en config.js). Mientras tanto, crea un perfil en este dispositivo.", eDw: "Servicio de acceso no disponible por ahora. Inténtalo de nuevo o crea un perfil en este dispositivo.", eBad: "Correo o contraseña incorrectos.", eCf: "Confirma primero tu correo.", eEx: "Esta cuenta ya existe: inicia sesión.", eRt: "Demasiados correos enviados: inténtalo más tarde.", eKey: "Clave de Supabase no válida: revisa config.js.", eFe: "No se puede contactar con Supabase: revisa config.js.", eSv: "Usuario guardado.", eGen: "Error de acceso.",
 alOn: "✓ Alertas por correo activadas", alOff: "Recibir nuevos documentales por correo", alNeed: "Alertas por correo: crea una cuenta con tu correo.", alEn: "Activar", alDis: "Desactivar",
 lD: "Documental", lA: "Película de archivo", lC: "Clip", lW: "Documental escrito", wa: "▶ Ver", rd: "Leer", dis: "Descubre: {t}", bf: "Porque sigues «{t}»", bl: "Porque te gusta «{t}»",
 bk: "‹ Volver", lk: "♥ Me gusta", hd: "✕ No me interesa", rel: "También te puede interesar", ld: "Cargando el artículo completo…", lu: "Texto completo no disponible por ahora.",
 by: "Por {a}", cv: "Artículo republicado de {s} bajo licencia Creative Commons (Atribución – Sin obra derivada). Texto íntegro, sin modificar.", or: "Artículo original", wk: "Artículo de Wikipedia, escrito por sus colaboradores, licencia {l}.", wo: "Artículo original", wau: "Autores", wl: "Licencia", wi: "Imagen: Wikimedia Commons.", ar: "Vídeo alojado en Internet Archive.", au: "Autor: {a}.", yt: "Vídeo de {s}, reproducido desde YouTube.", dr: "Por la redacción de Docu",
 pl: "Reproducir", ps: "La reproducción tarda en empezar.", pr: "Reintentar", po: "Abrir el reproductor original", pt: "¿Problema de reproducción?", sf: "Subtítulos en francés disponibles (botón CC del reproductor).", sn: "No hay subtítulos en francés para esta película.", sy: "Subtítulos en francés solicitados. Si faltan: rueda del reproductor, Subtítulos, Traducir automáticamente.", se: "Subtítulos disponibles solo en inglés.", sk: "Buscando subtítulos…",
 t_espace: "Espacio", t_animaux: "Animales", t_oceans: "Océanos", t_climat: "Clima", t_sante: "Salud y cerebro", t_histoire: "Historia", t_archeo: "Arqueología y fósiles", t_tech: "Tecnología", t_physique: "Física y química", t_terre: "Planeta Tierra" },
it: { nh: "Home", nt: "Oggi", ns: "Cerca", nl: "Libreria", sub: "Nuovi documentari da scoprire ogni giorno.", cnt: "{n} documentari e articoli da scoprire", hi: "Buongiorno", ev: "Buonasera", sD: "Documentari da guardare", sF: "Per te", sW: "Documentari scritti", td: "Oggi", sh: "Cerca", sph: "Documentari, temi, autori…", cA: "Tutto", cD: "Documentari", cW: "Testi", cS: "Con sottotitoli", cats: "Categorie", more: "Mostra altro", none: "Nessun risultato.", lh: "Libreria", lt: "Temi seguiti", ll: "I miei preferiti", f1: "Note legali", f2: "Privacy", f3: "Gestisci i cookie", no: "Rifiuta", ok: "Accetta", login: "Accedi",
 st: "Impostazioni", sAcc: "Account", sLog: "Accedi / Registrati", sLang: "Lingua", sMode: "Modalità", mA: "Auto", mL: "Chiaro", mD: "Scuro", sCol: "Colore dell'interfaccia", sTxt: "Dimensione del testo", sVid: "Video", sSub: "Sottotitoli in francese se disponibili", sMot: "Riduci le animazioni", sRes: "Ripristina", close: "Chiudi", c0: "Tramonto", c1: "Oceano", c2: "Foresta", c3: "Rosa", c4: "Ambra", c5: "Ardesia",
 aL: "Accedi", aC: "Crea un account", aM: "Il mio account", aP: "Nome utente (da 3 a 20 caratteri)", aW: "Password (min. 8 caratteri)", aB: "Accedi", aB2: "Crea il mio account", aH: "Ho già un account", aOut: "Esci", bk: "‹ Indietro", lk: "♥ Mi piace", hd: "✕ Non mi interessa", rel: "Potrebbe interessarti", wa: "▶ Guarda", rd: "Leggi", lD: "Documentario", lW: "Documentario scritto",
 t_espace: "Spazio", t_animaux: "Animali", t_oceans: "Oceani", t_climat: "Clima", t_sante: "Salute e cervello", t_histoire: "Storia", t_archeo: "Archeologia e fossili", t_tech: "Tecnologia", t_physique: "Fisica e chimica", t_terre: "Pianeta Terra" },
pt: { nh: "Início", nt: "Hoje", ns: "Pesquisa", nl: "Biblioteca", sub: "Novos documentários para descobrir todos os dias.", cnt: "{n} documentários e artigos para descobrir", hi: "Bom dia", ev: "Boa noite", sD: "Documentários para ver", sF: "Para si", sW: "Documentários escritos", td: "Hoje", sh: "Pesquisa", sph: "Documentários, temas, autores…", cA: "Tudo", cD: "Documentários", cW: "Textos", cS: "Com legendas", cats: "Categorias", more: "Mostrar mais", none: "Sem resultados.", lh: "Biblioteca", lt: "Temas seguidos", ll: "Os meus favoritos", f1: "Aviso legal", f2: "Privacidade", f3: "Gerir cookies", no: "Recusar", ok: "Aceitar", login: "Entrar",
 st: "Definições", sAcc: "Conta", sLog: "Entrar / Registar", sLang: "Idioma", sMode: "Modo", mA: "Auto", mL: "Claro", mD: "Escuro", sCol: "Cor da interface", sTxt: "Tamanho do texto", sVid: "Vídeos", sSub: "Legendas em francês quando disponíveis", sMot: "Reduzir animações", sRes: "Repor", close: "Fechar", c0: "Pôr do sol", c1: "Oceano", c2: "Floresta", c3: "Rosa", c4: "Âmbar", c5: "Ardósia",
 aL: "Entrar", aC: "Criar conta", aM: "A minha conta", aP: "Utilizador (3 a 20 caracteres)", aW: "Palavra-passe (mín. 8 caracteres)", aB: "Entrar", aB2: "Criar a minha conta", aH: "Já tenho conta", aOut: "Sair", bk: "‹ Voltar", lk: "♥ Gosto", hd: "✕ Sem interesse", rel: "Também pode interessar", wa: "▶ Ver", rd: "Ler", lD: "Documentário", lW: "Documentário escrito",
 t_espace: "Espaço", t_animaux: "Animais", t_oceans: "Oceanos", t_climat: "Clima", t_sante: "Saúde e cérebro", t_histoire: "História", t_archeo: "Arqueologia e fósseis", t_tech: "Tecnologia", t_physique: "Física e química", t_terre: "Planeta Terra" },
};
let lang = "fr";
const t = (k, v) => { let s = (L[lang] && L[lang][k]) ?? L.en[k] ?? L.fr[k] ?? k; if (v) for (const x in v) s = s.replace("{" + x + "}", v[x]); return s; };
const nf = n => n.toLocaleString(LOC[lang]);
const fmt = d => { const x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString(LOC[lang], { day: "numeric", month: "long", year: "numeric" }); };
function traduire() {
  document.documentElement.lang = lang;
  $$("[data-i]").forEach(el => el.textContent = t(el.dataset.i));
  $$("[data-ph]").forEach(el => el.placeholder = t(el.dataset.ph));
  $$("#pCol .swb").forEach(b => { b.title = t("c" + b.dataset.acc); b.setAttribute("aria-label", t("c" + b.dataset.acc)); });
}

/* ===== 2. Thématiques ===== */
const TRX = {
  espace: /espace|astro|galaxie|plan[èe]te|nasa|apollo|[ée]toile|mars\b|lune|trou noir|t[ée]lescope|cosm|satellite|solaire|fus[ée]e|astronaute|orbite|jupiter|saturne|\bspace\b|planet|galaxy/i,
  animaux: /animal|faune|esp[èe]ce|oiseau|requin|baleine|insecte|f[ée]lin|singe|loup|ours|pr[ée]dateur|wildlife|lion|zoolog|mammif|\bbird|shark|whale/i,
  oceans: /oc[ée]an|\bmer\b|marin|corail|poisson|plong[ée]e|dauphin|\bsea\b|reef|\bfish/i,
  climat: /climat|r[ée]chauffement|carbone|pollution|[ée]colog|glacier|s[ée]cheresse|biodiversit|for[êe]t|climate|environment|forest/i,
  sante: /sant[ée]|cerveau|m[ée]dic|cancer|virus|vaccin|maladie|sommeil|g[ée]n[ée]tique|\badn\b|neuro|health|brain|disease|medicine/i,
  histoire: /histoire|antique|[ée]gypt|romain|m[ée]di[ée]val|guerre|pharaon|civilisation|pr[ée]histoire|history|ancient|\bwar\b/i,
  archeo: /arch[ée]olog|fouille|momie|fossile|dinosaure|pal[ée]ontolog|n[ée]andertal|fossil|dinosaur/i,
  tech: /intelligence artificielle|\bIA\b|robot|ordinateur|technolog|num[ée]rique|quantique|batterie|drone|internet|informatique|computer|engineering/i,
  physique: /physique|particule|atome|chimie|mati[èe]re|laser|[ée]nergie|nucl[ée]aire|physics|chemistry|energy/i,
  terre: /volcan|s[ée]isme|tremblement|g[ée]olog|montagne|d[ée]sert|m[ée]t[ée]o|temp[êe]te|tsunami|earth|volcano|weather|geology/i,
};
const TN = k => t("t_" + k);
const tagger = i => Object.keys(TRX).filter(k => TRX[k].test(i.titre + " " + i.texte));

/* ===== 3. Profil + réglages ===== */
const ACC = [["#f6935f", "#d2517f", "#7a3d9a"], ["#2bb3c0", "#2f7de1", "#3a3fb8"], ["#8cc152", "#2e9e6b", "#1b6b6b"], ["#ff8fb1", "#e0457b", "#9d2a6b"], ["#f7c04a", "#f0803c", "#c8452c"], ["#6c7a89", "#44505e", "#232b36"]];
const ZOOM = [0.92, 1, 1.15];
const nav = (navigator.language || "fr").slice(0, 2);
const REGL = { lang: LOC[nav] ? nav : "fr", mode: "auto", acc: 0, zoom: 1, stFr: true, mot: false };
let P = { w: {}, follows: [], liked: [], hidden: [], clicked: [], last: Date.now(), ...store.get("profil", {}) };
P.s = { ...REGL, ...(P.s || {}) };
lang = L[P.s.lang] ? P.s.lang : "fr";
const prevVisit = P.last;
for (const k in P.w) P.w[k] *= Math.pow(0.97, (Date.now() - P.last) / 864e5);
P.last = Date.now();
let sb = null, user = null, local = store.get("local", null), tSave = null, aboActif = false;
function save() {
  store.set("profil", P);
  if (sb && user) { clearTimeout(tSave); tSave = setTimeout(() => sb.from("profils").upsert({ id: user.id, data: P, updated_at: new Date().toISOString() }).then(() => {}, () => {}), 800); }
}
const bump = (i, v) => i.tags.forEach(t => P.w[t] = (P.w[t] || 0) + v);
function appliquer() {
  const s = P.s, r = document.documentElement, a = ACC[s.acc] || ACC[0];
  lang = L[s.lang] ? s.lang : "fr"; r.dataset.theme = s.mode;
  r.style.setProperty("--g1", a[0]); r.style.setProperty("--g2", a[1]); r.style.setProperty("--g3", a[2]); r.style.setProperty("--zoom", ZOOM[s.zoom] ?? 1);
  r.classList.toggle("calme", !!s.mot);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = a[1];
  traduire();
}

/* ===== 4. Recommandation ===== */
function score(i) {
  const age = (Date.now() - i.ts) / 864e5, fraicheur = isNaN(age) ? 0.2 : Math.exp(-age / 30);
  const aff = i.tags.reduce((a, t) => a + (P.w[t] || 0) + (P.follows.includes(t) ? 3 : 0), 0) / Math.sqrt(Math.max(1, i.tags.length));
  return aff + fraicheur + (i.genre === "documentaire" || i.q ? 0.7 : 0) + Math.random() * 0.6 - (P.clicked.includes(i.id) ? 1.5 : 0);
}
function recommander(items, n) {
  const pool = items.filter(i => !P.hidden.includes(i.id)).map(i => ({ i, s: score(i) })), out = [], vu = {};
  while (out.length < n && pool.length) {
    pool.forEach(p => p.m = p.s - 0.8 * p.i.tags.reduce((a, t) => a + (vu[t] || 0), 0));
    let b = 0; pool.forEach((p, k) => { if (p.m > pool[b].m) b = k; });
    const p = pool.splice(b, 1)[0]; out.push(p.i); p.i.tags.forEach(t => vu[t] = (vu[t] || 0) + 1);
  }
  return out;
}
function raison(i) {
  const k = [...i.tags].sort((a, b) => (P.w[b] || 0) + (P.follows.includes(b) ? 3 : 0) - (P.w[a] || 0) - (P.follows.includes(a) ? 3 : 0))[0];
  if (!k) return "";
  return P.follows.includes(k) ? t("bf", { t: TN(k) }) : P.w[k] > 0.5 ? t("bl", { t: TN(k) }) : t("dis", { t: TN(k) });
}

/* ===== 5. Visuels : illustration immédiate + vraie image au fil du défilement ===== */
const COUL = { espace: ["#1b1f4b", "#6a3fa0"], oceans: ["#0b4f6c", "#20a4a8"], animaux: ["#3d6b2f", "#a3b83a"], climat: ["#1f5f4a", "#58a36c"], sante: ["#8a1c3b", "#e0566f"], histoire: ["#6b3b1b", "#d28a3c"], archeo: ["#5a3a22", "#c9a15a"], tech: ["#22223a", "#4a6cf7"], physique: ["#3a1c71", "#d76d77"], terre: ["#7a2e0e", "#e9803a"], _: ["#e8794d", "#7a3d9a"] };
const imgOk = u => /^https:\/\/[\w.\-\/?=&%,+~:@;()]+$/.test(u || "");
function art(i) {
  const k = i.tags[0] || "_"; let r = parseInt(i.id.slice(1), 36) % 2147483646 + 1; const R = () => (r = r * 16807 % 2147483647) / 2147483647; let g = "";
  if (k === "espace") for (let n = 0; n < 45; n++) g += `<circle cx="${R() * 400 | 0}" cy="${R() * 300 | 0}" r="${(R() * 1.8 + .4).toFixed(1)}" fill="#fff" opacity="${(R() * .7 + .2).toFixed(2)}"/>`;
  else if (k === "oceans") for (let n = 0; n < 7; n++) g += `<path d="M0 ${50 + n * 40} Q50 ${20 + n * 40} 100 ${50 + n * 40} T200 ${50 + n * 40} T300 ${50 + n * 40} T400 ${50 + n * 40}" fill="none" stroke="#fff" stroke-width="2" opacity=".22"/>`;
  else if (k === "terre") g = `<path d="M0 300 L70 160 L120 220 L190 110 L260 230 L320 150 L400 260 L400 300Z" fill="#fff" opacity=".16"/><circle cx="320" cy="70" r="34" fill="#fff" opacity=".18"/>`;
  else if (k === "tech") for (let n = 0; n < 12; n++) g += `<path d="M${R() * 400 | 0} 0V300M0 ${R() * 300 | 0}H400" stroke="#fff" opacity=".12"/><circle cx="${R() * 400 | 0}" cy="${R() * 300 | 0}" r="4" fill="#fff" opacity=".4"/>`;
  else for (let n = 0; n < 6; n++) g += `<circle cx="${300 + (R() * 60 | 0)}" cy="${50 + (R() * 40 | 0)}" r="${30 + n * 34}" fill="none" stroke="#fff" stroke-width="2" opacity="${(.22 - n * .03).toFixed(2)}"/>`;
  return `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${g}</svg>`)}')`;
}
const fond = i => { const [a, b] = COUL[i.tags[0] || "_"]; return `background:${art(i)} center/cover,linear-gradient(160deg,${a},${b})`; };
const lazy = i => imgOk(i.image) ? ` data-src="${i.image}" data-full="linear-gradient(transparent 45%,#0008),url('${i.image}') center/cover,${COUL[i.tags[0] || "_"][0]}"` : "";
const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target); const el = e.target, im = new Image(); im.onload = () => { el.style.background = el.dataset.full; }; im.src = el.dataset.src; }), { rootMargin: "300px" }) : null;
function observer() { $$("[data-full]:not([data-obs])").forEach(el => { el.dataset.obs = 1; if (io) io.observe(el); else el.style.background = el.dataset.full; }); }
let rafObs = 0; new MutationObserver(() => { if (!rafObs) rafObs = requestAnimationFrame(() => { rafObs = 0; observer(); }); }).observe(document.body, { childList: true, subtree: true });

/* ===== 6. Listes ===== */
let nBase = 0, courant = null, tous = [], byId = new Map(), cat = null, typ = "all", limite = 48, H = null;
const visibles = () => tous.filter(i => !P.hidden.includes(i.id));
const lienOk = u => /^https?:\/\//i.test(u || "");
const play = s => `<i class="pl${s ? " s" : ""}"></i>`;
const ccb = i => i.cc ? '<b class="ccb">CC</b>' : "";
const meta = i => [i.sourceNom, i.duree ? i.duree + " min" : "", i.langue && i.langue !== "FR" ? i.langue : "", i.date ? fmt(i.date) : ""].filter(Boolean).join(" · ");
const label = i => i.genre === "documentaire" ? t("lD") : i.genre === "archive" ? t("lA") : i.video ? t("lC") : t("lW");
const rw = (i, r) => `<button class="rw" data-open="${i.id}"><span class="th" style="${fond(i)}"${lazy(i)}>${ccb(i)}${i.video ? play(1) : ""}</span><span class="rt"><b>${esc(i.titre)}</b><small>${esc(r ? raison(i) || meta(i) : meta(i))}</small></span></button>`;
const cc = i => `<button class="cc" data-open="${i.id}" style="${fond(i)}"${lazy(i)}><span class="chip">${esc(label(i))} · ${esc(i.sourceNom)}</span><span class="ct">${esc(i.titre)}</span><span class="cx">${esc(i.texte)}</span><span class="go">${i.video ? t("wa") : t("rd")}</span></button>`;
const mc = i => `<button class="mc" data-open="${i.id}"><span class="pic" style="${fond(i)}"${lazy(i)}>${ccb(i)}${play()}</span><b>${esc(i.titre)}</b><small>${esc([i.sourceNom, i.duree ? i.duree + " min" : ""].filter(Boolean).join(" · "))}</small></button>`;
const lst = ids => ids.map(x => byId.get(x)).filter(i => i && !P.hidden.includes(i.id));
const avecPubs = l => { const o = []; l.forEach((c, k) => { if (k && k % 9 === 0) o.push('<div class="ad" data-slot="inline" style="grid-column:1/-1"></div>'); o.push(c) }); return o.join(""); };
const compteur = () => { $("#count").textContent = tous.length ? t("cnt", { n: nf(tous.length) }) : t("sub"); };
const dateLongue = d => d.toLocaleDateString(LOC[lang], { weekday: "long", day: "numeric", month: "long" });

function calculerAccueil() {
  const base = visibles(), car = recommander(base, 5), vus = new Set(car.map(i => i.id));
  H = { car: car.map(i => i.id), vid: recommander(base.filter(i => i.genre === "documentaire" && !vus.has(i.id)), 10).map(i => i.id), reco: recommander(base.filter(i => !vus.has(i.id)), 12).map(i => i.id), art: recommander(base.filter(i => !i.video), 12).map(i => i.id) };
}
function rendreAccueil() {
  if (!H) calculerAccueil();
  $("#hello").textContent = t(new Date().getHours() < 18 ? "hi" : "ev"); compteur();
  $("#car").innerHTML = lst(H.car).map(cc).join("");
  const v = lst(H.vid); $("#sVid").hidden = !v.length; $("#hsVid").innerHTML = v.map(mc).join("");
  const nouv = visibles().filter(i => i.ts > prevVisit && i.tags.some(t => P.follows.includes(t))).slice(0, 6);
  $("#sNew").hidden = !nouv.length; $("#gNew").innerHTML = nouv.map(i => rw(i, true)).join("");
  $("#gReco").innerHTML = avecPubs(lst(H.reco).map(i => rw(i, true)));
  const a = lst(H.art); $("#sArt").hidden = !a.length; $("#gArt").innerHTML = a.map(i => rw(i)).join("");
}
function rendreJour() {
  const pool = tous.slice(0, nBase).filter(i => !P.hidden.includes(i.id)).sort((a, b) => a.id < b.id ? -1 : 1), n = pool.length, jour = Math.floor(Date.now() / 864e5), du = k => pool[((jour - k) % n + n) % n];
  $("#dateJ").textContent = dateLongue(new Date());
  if (!n) { $("#jour").innerHTML = ""; $("#avant").innerHTML = ""; return; }
  const j = du(0); $("#jour").innerHTML = `<button class="jour" data-open="${j.id}" style="${fond(j)}"${lazy(j)}><span>${esc(label(j))} · ${esc(j.sourceNom)}</span><b>${esc(j.titre)}</b><span>${esc(j.texte.slice(0, 130))}</span></button>`;
  $("#avant").innerHTML = [1, 2, 3, 4, 5, 6].map(k => { const x = du(k); return `<button class="rw" data-open="${x.id}"><span class="th" style="${fond(x)}"${lazy(x)}>${x.video ? play(1) : ""}</span><span class="rt"><b>${esc(x.titre)}</b><small>${dateLongue(new Date(Date.now() - k * 864e5))}</small></span></button>` }).join("");
}
const okTyp = i => typ === "all" || (typ === "doc" && i.genre === "documentaire") || (typ === "clip" && i.video && i.genre !== "documentaire") || (typ === "article" && !i.video) || (typ === "cc" && i.cc);
function rendreRecherche() {
  $("#catGrid").innerHTML = Object.keys(TRX).map(k => `<button class="cat" data-cat="${k}" style="${fond({ tags: [k], id: "i" + k })}"><span>${esc(TN(k))}</span></button>`).join("");
  $$("[data-typ]").forEach(b => b.setAttribute("aria-pressed", b.dataset.typ === typ));
  const q = $("#q").value.toLowerCase().trim(), actif = q || cat || typ !== "all";
  $("#cats").hidden = !!actif; $("#hRes").hidden = !actif;
  const res = actif ? visibles().filter(i => (!cat || i.tags.includes(cat)) && okTyp(i) && (!q || (i.titre + " " + i.texte + " " + (i.auteurs || []).join(" ")).toLowerCase().includes(q))) : [];
  $("#hRes").textContent = (cat ? TN(cat) + " · " : "") + t(res.length === 1 ? "r1" : "rN", { n: nf(res.length) });
  $("#gRes").innerHTML = res.slice(0, limite).map(i => rw(i)).join("");
  $("#more").hidden = res.length <= limite; $("#msg").hidden = !(actif && !res.length);
}
function rendreBiblio() {
  $("#topics").innerHTML = Object.keys(TRX).map(k => `<button class="pill" data-t="${k}" aria-pressed="${P.follows.includes(k)}">${P.follows.includes(k) ? "✓ " : "+ "}${esc(TN(k))}</button>`).join("");
  const aimes = tous.filter(i => P.liked.includes(i.id)); $("#gLiked").innerHTML = aimes.map(i => rw(i)).join(""); $("#noLiked").hidden = aimes.length > 0;
}
function rendre() { rendreAccueil(); rendreJour(); rendreRecherche(); rendreBiblio(); montrerPubs(); }
function onglet(k) {
  $$(".view").forEach(v => v.classList.toggle("on", v.id === "v-" + k)); $$("#tabs button[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === k));
  if (k !== "search") { cat = null; typ = "all"; $("#q").value = ""; limite = 48; }
  if (k === "home") H = null;
  rendre(); scrollTo(0, 0);
}

/* ===== 7. Page d'un contenu + lecteur fiable ===== */
const SKIP = /^(Notes et références|Voir aussi|Liens externes|Bibliographie|Articles connexes|Sources|Références|Annexes|Notes|Liens internes)$/i;
function wikiHtml(txt) {
  let saute = false; const o = [];
  for (const l of txt.split("\n")) {
    const b = l.trim(); if (!b) continue;
    const m = b.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (m) { saute = SKIP.test(m[2]); if (!saute) o.push(`<h${m[1].length}>${esc(m[2])}</h${m[1].length}>`); continue; }
    if (!saute) o.push(`<p>${esc(b)}</p>`);
  }
  return o.join("");
}
async function chargerWiki(i) {
  try {
    const j = await (await fetch(`https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&pageids=${i.ref}&format=json&formatversion=2&origin=*`)).json();
    const x = (j.query.pages[0].extract || "").trim(); if (courant !== i.id || !$("#wk")) return;
    if (x.length > i.texte.length) $("#wk").innerHTML = wikiHtml(x); else if ($("#wkm")) $("#wkm").remove();
  } catch { if (courant === i.id && $("#wkm")) $("#wkm").textContent = t("lu"); }
}
let essai = 0;
const origine = i => i.source === "youtube" ? "https://www.youtube.com/watch?v=" + i.ref : "https://archive.org/details/" + i.ref;
const ytUrl = u => u + (P.s.stFr ? "?cc_load_policy=1&cc_lang_pref=fr&hl=fr&rel=0" : "?rel=0");
function noteLecteur(i, lent) {
  const n = $("#pnote"); if (!n) return;
  n.innerHTML = (lent ? esc(t("ps")) + ` <button class="lnk" data-retry="${i.id}">${esc(t("pr"))}</button> · ` : esc(t("pt")) + " ") + `<a href="${esc(origine(i))}" target="_blank" rel="noopener">${esc(t("po"))}</a>`;
}
function iframe(zone, url, i) {
  zone.innerHTML = ""; const f = document.createElement("iframe");
  f.src = url; f.allow = "autoplay; fullscreen; picture-in-picture"; f.allowFullscreen = true; f.title = i.titre;
  let ok = false; f.onload = () => { ok = true; }; zone.appendChild(f); noteLecteur(i, false);
  setTimeout(() => { if (!ok && zone.contains(f)) noteLecteur(i, true); }, 12000);
}
async function sousTitres(id) {
  const c = new AbortController(), to = setTimeout(() => c.abort(), 7000);
  try {
    const j = await (await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, { signal: c.signal })).json();
    const fs = j.files || [], base = `https://archive.org/download/${encodeURIComponent(id)}/`, u = f => base + f.name.split("/").map(encodeURIComponent).join("/");
    const subs = fs.filter(f => /\.(vtt|srt)$/i.test(f.name));
    const mp4 = fs.filter(f => /\.mp4$/i.test(f.name)).sort((a, b) => (a.source === "derivative" ? 0 : 1) - (b.source === "derivative" ? 0 : 1))[0];
    const fr = subs.find(f => /(^|[^a-z])(fr|fra|fre|french|fran[cç]ais)([^a-z]|$)/i.test(f.name)), en = subs.find(f => /(^|[^a-z])(en|eng|english)([^a-z]|$)/i.test(f.name));
    return { mp4: mp4 ? u(mp4) : "", fr: fr ? { name: fr.name, url: u(fr) } : null, en: !!en };
  } finally { clearTimeout(to); }
}
async function lecteurNatif(zone, i, info) {
  const v = document.createElement("video"); v.controls = true; v.playsInline = true; v.preload = "metadata"; v.crossOrigin = "anonymous"; v.src = info.mp4;
  let url = info.fr.url;
  if (/\.srt$/i.test(info.fr.name)) { try { const txt = await (await fetch(url)).text(); url = URL.createObjectURL(new Blob(["WEBVTT\n\n" + txt.replace(/\r/g, "").replace(/(\d+:\d+:\d+),(\d+)/g, "$1.$2")], { type: "text/vtt" })); } catch { url = ""; } }
  if (url) { const tr = document.createElement("track"); tr.kind = "subtitles"; tr.srclang = "fr"; tr.label = "Français"; tr.src = url; tr.default = true; v.appendChild(tr); }
  zone.innerHTML = ""; zone.appendChild(v); noteLecteur(i, false);
  let ok = false; v.onloadedmetadata = () => { ok = true; };
  const secours = () => { if (zone.contains(v)) { iframe(zone, i.video, i); $("#stt").textContent = t("sn"); } };   // si le lecteur natif échoue : lecteur d'origine
  v.onerror = secours; setTimeout(() => { if (!ok) secours(); }, 12000);
}
async function lancer(i) {
  const zone = $("#pz"); if (!i || !zone) return; const mon = ++essai, st = $("#stt");
  if (i.source === "youtube") { iframe(zone, ytUrl(i.video), i); st.textContent = P.s.stFr ? t("sy") : ""; return; }
  if (i.source !== "archive") { iframe(zone, i.video, i); return; }
  if (!P.s.stFr) { iframe(zone, i.video, i); return; }
  st.textContent = t("sk"); let info = null; try { info = await sousTitres(i.ref); } catch {}
  if (mon !== essai || !$("#pz")) return;
  if (info && info.fr && info.mp4) { st.textContent = t("sf"); lecteurNatif(zone, i, info); return; }
  iframe(zone, i.video, i); st.textContent = info ? (info.en ? t("se") : t("sn")) : "";
}
function ouvrir(id) {
  const i = byId.get(id); if (!i) return; courant = id; essai++;
  bump(i, 1.5); if (!P.clicked.includes(id)) P.clicked.push(id); save();
  const wiki = i.source === "wikipedia" && /^\d+$/.test(i.ref || "");
  const corps = wiki ? `<div id="wk"><p>${esc(i.texte)}</p><p class="mut" id="wkm">${esc(t("ld"))}</p></div>` : i.html || (i.corps && i.corps.length ? i.corps : [i.texte]).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("");
  const okV = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[\w-]+|archive\.org\/embed\/[\w.\-]+)$/.test(i.video || "");
  const vid = okV ? `<div id="pz"><button class="facade" data-play="${i.id}" style="${fond(i)}"${lazy(i)} aria-label="${esc(t("pl"))}"><i class="pl big"></i></button></div><p class="st" id="stt"></p><p id="pnote"></p>` : "";
  const aut = (i.auteurs || []).join(", "), cap = i.credit && i.source === "conversation" ? `<p class="cap">${esc(i.credit)}</p>` : "";
  const pixel = /^https:\/\/counter\.theconversation\.com\//.test(i.pixel || "") ? `<img src="${esc(i.pixel)}" width="1" height="1" alt="" style="border:0;position:absolute;opacity:0">` : "";
  const cred = i.source === "conversation"
    ? `<div class="cred"><p><b>${esc(t("by", { a: aut }))}</b></p><p>${esc(t("cv", { s: i.sourceNom }))}</p>${lienOk(i.lienOriginal) ? `<p><a href="${esc(i.lienOriginal)}" target="_blank" rel="noopener">${esc(t("or"))}</a></p>` : ""}</div>${pixel}`
    : wiki ? `<div class="cred"><p>${esc(t("wk", { l: "CC BY-SA 4.0" }))} <a href="https://fr.wikipedia.org/?curid=${i.ref}" target="_blank" rel="noopener">${esc(t("wo"))}</a> · <a href="https://fr.wikipedia.org/w/index.php?curid=${i.ref}&amp;action=history" target="_blank" rel="noopener">${esc(t("wau"))}</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">${esc(t("wl"))}</a></p>${i.image ? `<p>${esc(t("wi"))}</p>` : ""}</div>`
    : i.source === "archive" ? `<p class="cred">${esc(t("ar"))}${i.credit ? " " + esc(i.credit) + "." : ""}${aut ? " " + esc(t("au", { a: aut })) : ""}</p>`
    : i.source === "youtube" ? `<p class="cred">${esc(t("yt", { s: i.sourceNom }))}</p>` : `<p class="cred">${aut ? esc(t("by", { a: aut })) : esc(t("dr"))}</p>`;
  const lies = visibles().filter(x => x.id !== id && x.tags.some(k => i.tags.includes(k))).slice(0, 6);
  $("#detail").innerHTML = `<div class="hero" style="${fond(i)}"${lazy(i)}><button class="back" data-close>${esc(t("bk"))}</button><span>${esc(label(i))} · ${esc(i.sourceNom)}${i.date ? " · " + esc(fmt(i.date)) : ""}${i.langue && i.langue !== "FR" ? " · " + esc(i.langue) : ""}</span><b>${esc(i.titre)}</b>${aut && i.source !== "archive" ? `<span>${esc(t("by", { a: aut }))}</span>` : ""}</div>
  <div class="body">${vid}${cap}${corps}<div class="acts"><button class="pill ${P.liked.includes(id) ? "on" : ""}" data-like="${id}">${esc(t("lk"))}</button><button class="pill" data-hide="${id}">${esc(t("hd"))}</button></div>${cred}</div>
  ${lies.length ? `<div class="related"><h2>${esc(t("rel"))}</h2><div class="rows" style="grid-template-columns:1fr">${lies.map(x => rw(x)).join("")}</div></div>` : ""}`;
  $("#detail").hidden = false; $("#detail").scrollTop = 0; document.body.style.overflow = "hidden";
  if (wiki) chargerWiki(i);
}
function fermer() { $("#detail").hidden = true; document.body.style.overflow = ""; courant = null; essai++; $("#detail").innerHTML = ""; rendre(); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-open],[data-tab],[data-cat],[data-t],[data-close],[data-like],[data-hide],[data-typ],[data-play],[data-retry],#more,#btnAlert"); if (!b) return;
  const d = b.dataset;
  if (b.id === "btnAlert") majAbo(!aboActif);
  else if (d.play) lancer(byId.get(d.play)); else if (d.retry) lancer(byId.get(d.retry));
  else if (b.id === "more") { limite += 48; rendreRecherche(); }
  else if (d.open) ouvrir(d.open); else if (d.tab) onglet(d.tab); else if ("close" in d) fermer();
  else if (d.cat) { cat = d.cat; limite = 48; rendreRecherche(); }
  else if (d.typ) { typ = d.typ; limite = 48; rendreRecherche(); }
  else if (d.t) { P.follows = P.follows.includes(d.t) ? P.follows.filter(x => x !== d.t) : [...P.follows, d.t]; save(); H = null; rendreBiblio(); if (aboActif) majAbo(true); }
  else if (d.like) { const i = byId.get(d.like), on = P.liked.includes(i.id); P.liked = on ? P.liked.filter(x => x !== i.id) : [...P.liked, i.id]; bump(i, on ? -3 : 3); save(); b.classList.toggle("on", !on); }
  else if (d.hide) { const i = byId.get(d.hide); P.hidden.push(i.id); bump(i, -2); save(); fermer(); }
});
$("#q").oninput = () => { limite = 48; rendreRecherche(); };

/* ===== 8. Publicités + cookies ===== */
let consent = store.get("consent", null), adsLoaded = false;
function montrerPubs() {
  $$(".ad:not([data-done])").forEach(el => {
    el.dataset.done = 1;
    if (C.ADSENSE_CLIENT && consent === "yes") { el.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(C.ADSENSE_CLIENT)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`; try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {} }
    else if (C.AFFICHER_EMPLACEMENTS !== false) { el.classList.add("ph"); el.textContent = "Ad"; }
  });
}
function chargerAds() { if (adsLoaded || !C.ADSENSE_CLIENT || consent !== "yes") return; adsLoaded = true; const s = document.createElement("script"); s.async = true; s.crossOrigin = "anonymous"; s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(C.ADSENSE_CLIENT); document.head.appendChild(s); }
function choisir(v) { consent = v; store.set("consent", v); $("#consent").hidden = true; $$(".ad").forEach(a => { delete a.dataset.done; a.className = "ad"; a.innerHTML = ""; }); chargerAds(); montrerPubs(); }
$("#cYes").onclick = () => choisir("yes"); $("#cNo").onclick = () => choisir("no");
$("#cookies").onclick = e => { e.preventDefault(); $("#consent").hidden = false; };
if (consent === null) $("#consent").hidden = false; else chargerAds();

/* ===== 9. Connexion (pseudo + email) + alertes email ===== */
const ERR = { "Email rate limit exceeded": "eRt", "Invalid API key": "eKey", "Invalid login credentials": "eBad", "Email not confirmed": "eCf", "User already registered": "eEx" };
const PSEUDO_OK = /^[\p{L}\p{N}_\-. ]{3,20}$/u;
let inscription = false;
const nom = () => user ? ((user.user_metadata && user.user_metadata.pseudo) || (user.email || "").split("@")[0]) : local ? local.nom : "";
const compteTxt = () => user ? t("aCo", { n: nom(), e: user.email }) : local ? t("aPr", { n: local.nom }) + (local.email ? " (" + local.email + ")" : "") : t("aNo");
function majBtn() { const n = nom(); $$(".authBtn").forEach(b => b.textContent = n ? "👤 " + n : t("login")); $("#acct").textContent = compteTxt(); $("#acct2").textContent = compteTxt(); $("#bAcc").textContent = user || local ? t("sMy") : t("sLog"); }
function majAlert() {
  $("#alertes").hidden = !(user || local); $("#btnAlert").hidden = !user;
  $("#alTxt").textContent = t(user ? (aboActif ? "alOn" : "alOff") : "alNeed"); $("#btnAlert").textContent = t(aboActif ? "alDis" : "alEn");
}
async function majAbo(actif) {
  if (!sb || !user) return;
  try { const { error } = await sb.from("abonnes").upsert({ id: user.id, email: user.email, pseudo: nom(), actif, sujets: P.follows }); if (!error) aboActif = actif; } catch {}
  majAlert();
}
function brancher() {
  sb.auth.onAuthStateChange(async (_e, session) => {
    user = session?.user || null; majBtn();
    if (user) {
      try {
        const { data } = await sb.from("profils").select("data").eq("id", user.id).maybeSingle();
        if (data?.data) { P = { ...P, ...data.data, last: Date.now() }; P.s = { ...REGL, ...(P.s || {}) }; store.set("profil", P); appliquer(); H = null; rendre(); majBtn(); } else save();
        const ab = await sb.from("abonnes").select("actif").eq("id", user.id).maybeSingle(); aboActif = !!(ab.data && ab.data.actif);
        if (store.get("optin", false)) { store.set("optin", false); await majAbo(true); }
      } catch {}
    } else aboActif = false;
    majAlert();
  });
}
function initSb() {
  if (sb || !(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase)) return;
  try { sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); brancher(); } catch { sb = null; }
}
initSb();
if (!sb && C.SUPABASE_URL && C.SUPABASE_ANON_KEY && !window.supabase) {
  const sc = document.createElement("script"); sc.src = "https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  sc.onload = () => { initSb(); majBtn(); majAlert(); }; document.head.appendChild(sc);
}
const dire = (el, txt, info) => { el.textContent = txt; el.hidden = !txt; el.style.color = info ? "inherit" : ""; };
function titreAuth(co) { $("#dTitre").textContent = t(co ? "aM" : inscription ? "aC" : "aL"); $("#bOk").textContent = t(inscription ? "aB2" : "aB"); $("#bSw").textContent = t(inscription ? "aH" : "aC"); }
function dialogue() {
  const co = user || local; $("#fSb").hidden = !!co || !sb; $("#fLocal").hidden = !!co || !!sb; $("#fOut").hidden = !co;
  $("#pseudoWrap").hidden = !inscription; $("#pseudo").required = inscription; $("#optinWrap").hidden = !inscription; titreAuth(co);
  $("#who").textContent = user ? nom() + " — " + user.email : local ? t("aLoc", { n: local.nom }) : "";
  $("#editPseudo").hidden = !user; if (user) $("#newPseudo").value = nom(); dire($("#errP"), "");
  const manque = !(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  dire($("#dMsg"), co || sb ? "" : t(manque ? "eNc" : "eDw")); dire($("#err"), ""); dire($("#errL"), "");
  if ($("#dSet").open) $("#dSet").close(); $("#dlg").showModal();
}
$("#bX").onclick = () => $("#dlg").close();
$("#bSw").onclick = () => { inscription = !inscription; $("#pseudoWrap").hidden = !inscription; $("#pseudo").required = inscription; $("#optinWrap").hidden = !inscription; titreAuth(false); dire($("#err"), ""); };
$("#fSb").onsubmit = async e => {
  e.preventDefault(); dire($("#err"), "");
  const pseudo = $("#pseudo").value.trim();
  if (inscription && !PSEUDO_OK.test(pseudo)) return dire($("#err"), t("eP"));
  const args = { email: $("#em").value.trim(), password: $("#pw").value };
  try {
    const { data, error } = inscription ? await sb.auth.signUp({ ...args, options: { data: { pseudo } } }) : await sb.auth.signInWithPassword(args);
    if (error) throw error;
    if (inscription && $("#optin").checked) store.set("optin", true);
    if (inscription && !data.session) dire($("#err"), t("eCr"), true); else $("#dlg").close();
  } catch (x) { dire($("#err"), ERR[x.message] ? t(ERR[x.message]) : /fetch|network/i.test(x.message || "") ? t("eFe") : x.message || t("eGen")); }
};
$("#fLocal").onsubmit = e => {
  e.preventDefault(); const p = $("#pseudoL").value.trim();
  if (!PSEUDO_OK.test(p)) return dire($("#errL"), t("eP"));
  local = { nom: p, email: $("#emailL").value.trim() }; store.set("local", local); majBtn(); majAlert(); $("#dlg").close();
};
$("#bPseudo").onclick = async () => {
  const p = $("#newPseudo").value.trim(); if (!PSEUDO_OK.test(p)) return dire($("#errP"), t("eP"));
  try { const { data, error } = await sb.auth.updateUser({ data: { pseudo: p } }); if (error) throw error; user = data.user; majBtn(); majAlert(); if (aboActif) majAbo(true); $("#who").textContent = nom() + " — " + user.email; dire($("#errP"), t("eSv"), true); }
  catch (x) { dire($("#errP"), x.message || t("eGen")); }
};
$("#bOut").onclick = async () => { if (sb && user) await sb.auth.signOut(); user = null; local = null; aboActif = false; store.set("local", null); majBtn(); majAlert(); $("#dlg").close(); };

/* ===== 10. Paramètres (clic sur le profil) ===== */
$("#pCol").innerHTML = ACC.map((a, k) => `<button class="swb" data-acc="${k}" style="background:linear-gradient(135deg,${a[0]},${a[1]},${a[2]})"></button>`).join("");
function majReglages() {
  const s = P.s; $("#selLang").value = s.lang;
  $$("#pMode [data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === s.mode));
  $$("#pCol .swb").forEach(b => b.setAttribute("aria-pressed", +b.dataset.acc === s.acc));
  $$("#pTxt [data-zoom]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.zoom === s.zoom));
  $("#cbSub").checked = !!s.stFr; $("#cbMot").checked = !!s.mot;
}
function changer(patch) { P.s = { ...P.s, ...patch }; save(); appliquer(); rendre(); majBtn(); majAlert(); majReglages(); }
$$(".authBtn").forEach(b => b.onclick = () => { majBtn(); majReglages(); $("#dSet").showModal(); });
$("#bSetX").onclick = () => $("#dSet").close();
$("#bAcc").onclick = dialogue;
$("#selLang").onchange = e => changer({ lang: e.target.value });
$("#pMode").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) changer({ mode: b.dataset.mode }); };
$("#pCol").onclick = e => { const b = e.target.closest("[data-acc]"); if (b) changer({ acc: +b.dataset.acc }); };
$("#pTxt").onclick = e => { const b = e.target.closest("[data-zoom]"); if (b) changer({ zoom: +b.dataset.zoom }); };
$("#cbSub").onchange = e => changer({ stFr: e.target.checked }); $("#cbMot").onchange = e => changer({ mot: e.target.checked });
$("#bReset").onclick = () => changer({ ...REGL });

/* ===== 11. Mode direct Wikipédia (si le catalogue est trop petit) ===== */
const THEMES = ["astronomie", "océan", "faune", "climat", "cerveau", "histoire", "paléontologie", "robotique", "physique", "volcan", "médecine", "géologie", "écologie", "biologie", "chimie", "archéologie"];
const json = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
async function wikiDirect(cible) {
  const base = "https://fr.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=extracts%7Cpageimages%7Cpageprops&exintro=1&explaintext=1&exlimit=20&piprop=thumbnail&pithumbsize=480&pilimit=20&ppprop=disambiguation&generator=search&gsrnamespace=0&gsrlimit=20&gsrsearch=";
  let ajoutes = 0;
  for (let off = 0; off < 400 && ajoutes < cible; off += 20) {
    for (let k = 0; k < THEMES.length && ajoutes < cible; k += 4) {
      const lots = await Promise.all(THEMES.slice(k, k + 4).map(x => json(base + encodeURIComponent(x) + "&gsroffset=" + off)));
      const items = [];
      lots.forEach(j => ((j && j.query && j.query.pages) || []).forEach(p => {
        const ex = (p.extract || "").replace(/\s+/g, " ").trim();
        if (ex.length < 350 || (p.pageprops && "disambiguation" in p.pageprops) || /^Liste /.test(p.title)) return;
        const im = p.thumbnail && p.thumbnail.source;
        items.push({ source: "wikipedia", ref: String(p.pageid), titre: p.title, texte: ex.slice(0, 450), image: im && /^https:\/\/upload\.wikimedia\.org\//.test(im) ? im : "", genre: "ecrit" });
      }));
      const avant = tous.length; ajouter(items); ajoutes += tous.length - avant;
      compteur(); if ($("#v-search").classList.contains("on")) rendreRecherche();
    }
  }
}

/* ===== 12. Chargement rapide par tranches ===== */
const complet = i => i.source === "archive" ? { sourceNom: "Internet Archive", image: `https://archive.org/services/img/${i.ref}`, video: `https://archive.org/embed/${i.ref}`, ...i }
  : i.source === "wikipedia" ? { sourceNom: "Wikipédia", ...i }
  : i.source === "youtube" ? { image: `https://i.ytimg.com/vi/${i.ref}/hqdefault.jpg`, video: `https://www.youtube-nocookie.com/embed/${i.ref}`, ...i } : i;
function ajouter(items) {
  for (const o of items) {
    const i = complet(o); if (!i.titre) continue;
    i.texte = i.texte || ""; i.id = hash(i.source + (i.ref || i.titre)); if (byId.has(i.id)) continue;
    i.ts = new Date(i.date).getTime(); i.tags = tagger(i); byId.set(i.id, i); tous.push(i);
  }
}
let enAttente = (location.hash.match(/^#d-(i[0-9a-z]+)$/) || [])[1];
function ouvrirAttendu() { if (enAttente && byId.has(enAttente)) { const x = enAttente; enAttente = null; ouvrir(x); } }
appliquer(); majBtn(); majAlert(); compteur();
$("#gReco").innerHTML = '<div class="sk"></div>'.repeat(5);
Promise.all([json("data/manifest.json"), json("data/articles.json"), json("contenus.json")]).then(async ([man, a, own]) => {
  ajouter((Array.isArray(own) ? own : []).map(o => ({ source: "docu", sourceNom: "Rédaction Docu", ...o })));
  ajouter((a && a.items) || []);
  const m = man || {}, nv = (m.videos && m.videos.n) || 0, nw = (m.wiki && m.wiki.n) || 0;
  const premiers = await Promise.all([nv ? json("data/videos-1.json") : null, nw ? json("data/wiki-1.json") : null]);
  premiers.forEach(d => d && d.items && ajouter(d.items));
  nBase = tous.length; H = null; rendre(); save(); ouvrirAttendu();
  if (((m.wiki && m.wiki.total) || 0) < 1000) wikiDirect(1500);
  if (!tous.length) $("#gReco").innerHTML = '<p class="mut">…</p>';
  for (let k = 2; k <= Math.max(nv, nw); k++) {
    const ds = await Promise.all([k <= nv ? json(`data/videos-${k}.json`) : null, k <= nw ? json(`data/wiki-${k}.json`) : null]);
    ds.forEach(d => d && d.items && ajouter(d.items));
    compteur(); if ($("#v-search").classList.contains("on")) rendreRecherche(); ouvrirAttendu();
  }
});
