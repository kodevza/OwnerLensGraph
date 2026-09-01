import { GraphModel, HierarchicalLayout } from '../domain';

describe('HierarchicalLayout', () => {
  test('orders a layer by adjacent connections to avoid a crossing', () => {
    const model = new GraphModel();
    const root = model.upsertNode('root', 'Root');
    const a = model.upsertNode('a', 'A');
    const b = model.upsertNode('b', 'B');
    const c = model.upsertNode('c', 'C');
    const d = model.upsertNode('d', 'D');
    model.root = root;
    model.addEdge('root-a', root, a, '', 'relationship');
    model.addEdge('root-b', root, b, '', 'relationship');
    model.addEdge('a-d', a, d, '', 'relationship');
    model.addEdge('b-c', b, c, '', 'relationship');

    new HierarchicalLayout().apply(model, 16 / 9);

    expect(a.y).toBeLessThan(b.y);
    expect(d.y).toBeLessThan(c.y);
  });

  test('widens a tall graph in the existing left-to-right direction', () => {
    const model = new GraphModel();
    const root = model.upsertNode('root', 'Root');
    const children = ['A', 'B', 'C', 'D'].map((label) => model.upsertNode(label, label));
    model.root = root;
    children.forEach((child) => model.addEdge(`root-${child.id}`, root, child, '', 'relationship'));

    new HierarchicalLayout().apply(model, 2);

    expect(children[0].x - root.x).toBeGreaterThan(280);
    expect(children.map((child) => child.y)).toEqual(expect.arrayContaining([-150, -50, 50, 150]));
  });
});
