# OwnerLens Graph Explorer — React + object-oriented TypeScript

This version deliberately keeps the domain model object-oriented instead of converting everything to UI DTOs.

## Domain model

- `GraphNode` — a real class instance with attributes, icon, position, merge/search behavior.
- `GraphEdge` — a real class instance that references `GraphNode` objects directly (`source` and `target`).
- `GraphModel` — owns node/edge maps and graph operations such as neighbors/search.
- `OwnerLensGraphParser` — converts an OwnerLens JSON report into the object graph.
- `HierarchicalLayout` — positions the node objects.
- `IconResolver` — maps object types/resources to Microsoft Azure SVG icons.

The graph UI is custom SVG React code. There is no graph-renderer package such as Reagraph, which removes the dependency that caused the previous runtime issues.

## Run

```bash
npm install
npm run dev
```

Then use **Load JSON** and select an OwnerLens JSON file. The file is processed locally in the browser.

## Tests

```bash
npm test
```

Jest tests cover parsing, OOP node/edge instances, RBAC relationships, owner-candidate evidence, activity merging, icon mapping, search/navigation and layout.

## Production build

```bash
npm run build
npm run preview
```

## Azure icons

All 714 SVG icons from the supplied `Azure_Public_Service_Icons_V24.zip` are included under:

`public/icons/azure/`

The original category tree is preserved and `public/icons/azure/index.json` contains the icon index.
