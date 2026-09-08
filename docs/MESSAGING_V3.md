# Messagerie — version 3

## Direction approuvée

Fond clair existant, messages personnels vert forêt, sans drapeau ni slogan.
Liste de conversations familière ; sur téléphone, un seul salon à la fois.
Barre basse : pièces jointes, caméra, galerie, texte, emoji, micro quand vide,
flèche seule quand un texte ou une pièce jointe est prêt.
Glissement pour répondre à un message précis, aperçu de citation annulable,
et alternative clavier. Le contenu de la maquette est illustratif, non une
conversation à injecter en production.

## Contrat de confidentialité

Les groupes existants restent publics. Un groupe privé n'est visible que de
ses membres. Les liens d'invitation peuvent être révoqués et expirent.
Les vérifications concernent les messages, réponses, médias et membres.
Le responsable gère les invitations et les membres. Aucun chiffrement de bout
en bout n'est annoncé. Les messages signalés sont accessibles à la modération.

## Vérifications prévues

- Préservation des messages et groupes existants lors de la migration.
- Création publique/privée ; accès anonyme, membre, non-membre et administrateur.
- Invitation valide, expirée, révoquée ; exclusion et tentative de réinscription.
- Réponse texte et média, parent absent ou appartenant à un autre salon.
- Saisie vide, double clic, erreur réseau, nouvelle tentative, changement de salon.
- Lecture et aperçu des photos/vocaux ; fermeture caméra/micro.
- Clavier, glissement tactile, défilement, clavier virtuel et petites largeurs.
- Tests automatisés et navigateur documentés séparément des essais humains.

## Essais humains

Prévoir 10 à 20 volontaires consentants. Pour chaque personne : rejoindre un
groupe, écrire, répondre, joindre une photo, enregistrer un vocal et quitter.
Mesurer réussite sans aide, erreurs, compréhension de la confidentialité et
retour qualitatif. Aucun recrutement ni résultat humain n'est présumé.

## Résultats avant publication

- 45 tests Python réussis : validation, authentification, groupes privés,
  permissions, réponses et sécurité des médias.
- 42 contrôles PostgreSQL réels réussis dans un schéma temporaire isolé :
  migration depuis les tables précédentes, 20 comptes simulés, invitations,
  exclusions, citations, suppression, modération, médias et pagination.
  Le schéma temporaire a été supprimé ; aucune table de production n'a été modifiée.
- 17 scénarios Edge réussis avec API simulée : glissement tactile, citation,
  envoi par icône, brouillon après rechargement et erreur réseau, emoji, photo,
  caméra simulée, enregistrement simulé, invitation, FR/EN et connexion.
- Largeurs contrôlées : 320, 390, 820 et 1440 px, sans débordement horizontal.
- Vérification des types, ESLint et compilation VPS réussis.
- 8 contrôles de contrats du projet réussis, dont la détection de la base
  communautaire dans le script de sauvegarde.

Les essais ont corrigé le maintien de la barre sur ordinateur, le retour à
l'invitation après connexion et le formulaire de connexion avant son activation
JavaScript (envoi POST et bouton désactivé jusqu'à activation).

## Limites explicites

- Les 20 comptes sont simulés : aucun essai avec 20 personnes réelles n'est revendiqué.
- Aucun iPhone ou téléphone Android physique n'a encore été testé.
- Actualisation des conversations toutes les 2,5 secondes quand l'onglet est
  visible ; pas encore de notifications poussées, d'indicateur de saisie ou
  d'accusés de lecture.
- Le lecteur audio utilise les commandes natives du navigateur, pas une fausse
  forme d'onde dessinée depuis la maquette.
- Brouillons texte conservés dans l'onglet, par compte et salon, pendant 24 h ;
  effacés à la déconnexion. Les fichiers restent seulement en mémoire avant envoi.
- Les groupes existants restent publics ; nouveaux groupes privés par défaut.
- Maximum 200 membres par groupe, 20 groupes créés par compte et 100 groupes
  affichés. Invitations révocables valables 7 jours. 80 messages par page.

## Vérification après publication

Version applicative `0914ed251b43e643d954412d8f036254e3250089`, publiée sur
`main` et sur https://cameroon-169-58-83-56.sslip.io/community.
La compilation Docker Linux, la santé des services, la configuration Nginx
et la réponse HTTPS de la passerelle ont été vérifiées.

24 contrôles supplémentaires ont réussi sur le site public avec deux comptes
temporaires réels, des contenus synthétiques et Edge en affichage mobile :

- Inscription, connexion et création d'un groupe privé.
- Groupe invisible et messages inaccessibles au non-membre.
- Invitation, adhésion, échange et réponse liée au message d'origine.
- Photo convertie en JPEG ; vocal converti en Ogg et lu dans le navigateur.
- Réponse envoyée depuis l'interface et retrouvée après rechargement.
- Aucune erreur JavaScript pendant ce parcours.
- Après exclusion : messages et photo inaccessibles, ancienne invitation refusée.

La capture du parcours public a été inspectée : barre basse à icônes,
fond clair, bulles vertes et citations visibles. La caméra et le microphone
physiques restent à vérifier avec des volontaires sur leurs téléphones.

La sauvegarde préalable à cette version se trouve sur le VPS dans
`/opt/cameroon-backups/release-doR9qFqW`. Seuls les services web,
communautaire et la passerelle du projet Cameroon ont été redémarrés.

## Nettoyage et sauvegardes

Les deux comptes temporaires, leur unique groupe privé et ses cinq messages
(avec leurs médias) ont été supprimés après contrôle précis des identifiants.
Une seconde lecture confirme zéro compte, groupe ou message de ce test.
Les deux comptes préexistants sont conservés ; le site répond toujours en HTTPS.
La sauvegarde complète précédant ce nettoyage est conservée dans
`/opt/cameroon-backups/release-AS9Of6Do` pour permettre une récupération.

Le contrôle préalable a détecté qu'une sauvegarde intermédiaire avait omis
la base communautaire. La suppression a été bloquée sans modifier les données.
Le script a été corrigé : il récupère maintenant la liste complète des services
avant de la tester, ce qui évite une fermeture anticipée du tube sous
`pipefail`. La nouvelle sauvegarde inclut bien la base communautaire et a été
vérifiée avant nettoyage. Ne pas utiliser `release-RpZZBqQ2` comme sauvegarde
complète de cette version.
