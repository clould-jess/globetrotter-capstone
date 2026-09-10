# Carte et itinéraires — version 4

## Parcours réalisé

Depuis « Carte & trajets » ou le guide, ouvrir `/map`, choisir sa position
(uniquement après clic et autorisation), un point sur la carte ou un lieu,
ajouter jusqu'à dix étapes, les réordonner et calculer le trajet en voiture.
La sauvegarde appartient au compte connecté ; la modification conserve son
identifiant. Les anciens parcours et les autres fonctionnalités sont conservés.

## Direction visuelle approuvée

La méthode Impeccable a guidé la composition : fond clair et vert du site,
grande carte, recherche en haut, position bleue et repères numérotés.
Sur téléphone, le panneau se replie et peut être agrandi ; sur ordinateur,
il se place à côté de la carte. Le résumé calculé reste visible sur mobile.
Le vrai fond OpenStreetMap remplace la carte illustrative de la maquette.
Les listes longues défilent pour conserver des cibles tactiles accessibles.

## Données et confidentialité

- Restaurants, sites touristiques, gyms, monuments, ministères et hôtels :
  recherche explicite autour du centre de carte, rayon de 15 km, maximum
  100 objets du fournisseur. Couverture non exhaustive et dépendante d'Overpass.
- Résultats triés selon la distance à vol d'oiseau du centre recherché :
  ce n'est ni la distance routière ni forcément la distance depuis l'utilisateur.
- Recherche textuelle dans le catalogue et les résultats déjà chargés,
  insensible aux accents ; pas de géocodage universel d'adresses.
- Repères anciens du catalogue signalés comme indicatifs, y compris dans
  les nouvelles sauvegardes. Aucune précision fictive n'est ajoutée.
- OSRM fournit distance, durée et tracé routiers. Aucun trafic en temps réel,
  guidage vocal, suivi continu de position ni carte hors ligne n'est annoncé.
- Les coordonnées sont transmises aux fournisseurs uniquement pour l'action
  concernée ; les fonds cartographiques sont chargés depuis OpenStreetMap.
- Enregistrer conserve les étapes dans le compte. Les étapes non enregistrées
  restent en mémoire pendant la visite et sont perdues en quittant la page.

Les liens Google Maps fractionnent les longs trajets pour respecter les
[limites de points intermédiaires des navigateurs mobiles](https://developers.google.com/maps/documentation/urls/get-started#directions-action).
L'attribution et la politique de référent des fonds respectent les
[conditions d'utilisation des tuiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Vérifications avant publication

- 67 tests Python : dont 22 nouveaux contrôles de catégories autorisées,
  validation de coordonnées/réponses, distances, doublons, réponses partielles,
  limitations indépendantes des fournisseurs et modification réservée au propriétaire.
- 11 tests Node : contrats du projet, recherche, unités et conservation des
  dix étapes dans les liens Google Maps fractionnés.
- 22 scénarios Edge avec API et position simulées : ajout, réorganisation,
  calcul, erreur conservant les étapes, sauvegarde, modification sans doublon,
  rechargement, suppression, catégories, refus de localisation et français/anglais.
- Largeurs 320, 390, 820 et 1440 px ; panneau agrandi/replié ; résumé visible.
- Vérification TypeScript, ESLint et compilation VPS.

Les essais automatisés ne remplacent pas les essais sur des téléphones physiques.

## Vérification en production — 10 septembre 2026

Version applicative `3804f8b2edaec2978d675288299ec7cb94cda260`, publiée sur
la branche `main` et https://cameroon-169-58-83-56.sslip.io/map.
La compilation Linux, la santé des conteneurs, Nginx et HTTPS ont été vérifiés.

20 contrôles supplémentaires ont réussi avec deux comptes temporaires :
inscription/connexion, trajet OSRM réel, enregistrement, chargement dans Edge,
modification persistée sans doublon et suppression. Le second compte ne voit
pas le parcours et ne peut ni le modifier ni le supprimer. Le navigateur n'a
signalé aucune erreur JavaScript pendant ce parcours ; les fonds cartographiques
se sont chargés et la capture mobile a été inspectée.

Le trajet entre les deux coordonnées publiques de test à Yaoundé a renvoyé
912 m et environ 2 minutes, hors trafic. Ce résultat de vérification ne constitue
pas une recommandation de déplacement et peut évoluer avec les données routières.

Les recherches réelles autour de Yaoundé ont retourné 88 restaurants et
17 sites touristiques. La recherche des ministères a répondu HTTP 503 : le
service externe était indisponible pour cette requête. Elle n'est pas comptée
comme une recherche réussie. Les six catégories ont été contrôlées avec des
données simulées ; aucun résultat réel n'est inventé pour les catégories non
interrogées dans cette dernière vérification.

## Sauvegardes et nettoyage

- Sauvegarde complète avant publication :
  `/opt/cameroon-backups/release-8eLadq06`.
- Sauvegarde complète avant suppression des comptes temporaires :
  `/opt/cameroon-backups/release-MRSJMNc0`.
- Le parcours de test a été supprimé via son compte propriétaire ; les deux
  comptes temporaires ont ensuite été retirés après audit précis des identifiants.
- Vérification finale : aucun compte ni parcours de ce test ne subsiste ; les
  trois comptes préexistants sont conservés et la passerelle répond normalement.
- Seuls `web`, `community-service` et `gateway` du projet Cameroon ont été
  redémarrés. Les autres projets et les volumes du VPS sont conservés.
