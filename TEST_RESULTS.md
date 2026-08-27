# Validation performed in the generation environment

The domain TypeScript files were compiled with TypeScript 5.x successfully.

A smoke test executed the compiled domain classes against `examples/ownerlens-sample.json` and passed these checks:

- root is a `GraphNode` object
- all nodes are `GraphNode` instances
- all edges are `GraphEdge` instances
- root label is `super-learning-api-dev`
- 4 Storage Account resource objects are parsed
- 4 direct RBAC edges are parsed
- no explicit owner relationship is invented from owner candidates
- candidate-evidence relationships exist
- layout writes finite positions to node objects

Observed graph: 17 node objects, 25 edge objects.

The project also contains 10 Jest tests in `src/tests/OwnerLensGraphParser.test.ts`.

`npm install` could not complete in the generation sandbox because registry access timed out, so the Jest binary and Vite production build could not be executed there. On a normal machine:

```bash
npm install
npm test
npm run build
```
