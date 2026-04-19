# Docx Fill Frontend

App Next.js minimal pour tester en frontend le remplissage de vides dans un .docx.

Instructions rapides:

1. Installer les dépendances:

```bash
npm install
```

2. Lancer en mode développement:

```bash
npm run dev
```

3. Ouvrir http://localhost:3000, téléverser un `.docx` avec des underscores `_____`, remplir les champs et télécharger.

Note: implémentation front simple — certains docs .docx peuvent fragmenter les underscores en plusieurs runs, cas non géré ici. Pour production, on passera par un backend et Syncfusion comme demandé.

Serveur local (implémentation de test):

Le projet inclut désormais une API Next.js `/api/fill` qui accepte un `.docx` et un JSON `values` et renvoie le document rempli. Le frontend propose une case à cocher "Utiliser l'API serveur" pour tester le flux serveur.

Pour remplacer l'implémentation par la version serveur de Syncfusion (`@syncfusion/ej2-documenteditor-server`), éditez `pages/api/fill.js` et remplacez la logique de remplacement par les appels Syncfusion (nécessite licence en production — la version de démonstration peut être utilisée pendant le développement).
DocumentEditor (Syncfusion):

Vous pouvez utiliser le composant `DocumentEditorContainerComponent` avec sa barre d'outils native (bouton "Ouvrir") qui permet à l'utilisateur de sélectionner un fichier DOCX localement. Le composant s'appuie habituellement sur un service backend pour convertir DOCX→SFDT. Pour les tests, la page principale utilise le service de démonstration Syncfusion.

Installez le paquet DocumentEditor et lancez l'app:

```bash
npm install @syncfusion/ej2-react-documenteditor
npm run dev
```

La page d'accueil intègre maintenant `DocumentEditorContainerComponent` avec `enableToolbar={true}` et `serviceUrl` pointant sur le service de démonstration Syncfusion. En production, remplacez `serviceUrl` par votre backend capable de convertir DOCX en SFDT.
