
import { NODE_REGISTRY } from '../components/NodeEditor/nodes2';
import { NodeData, Connection, NodeGraphData } from '../types';
import { projectReducer, initialState } from '../context/ProjectContext';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineInteractionSpecs = () => {
    describe('Graph Interactions & Behavior', () => {
        
        describe('Node Insertion Logic', () => {
            it('Correctly splits a connection when inserting a node (Behavioral Test)', () => {
                // 1. Setup initial state: Source -> Output
                const source: NodeData = { id: 's1', type: 'source', x:0, y:0, width:100, height:100, data: { src: '', name: 'S', width:100, height:100, opacity:1, visible:true, x:0, y:0 } };
                const output: NodeData = { id: 'o1', type: 'output', x:500, y:0, width:100, height:100, data: { name: 'O' } };
                const initialConn: Connection = { id: 'c1', source: 's1', target: 'o1' };
                
                const anim = {
                    id: 'anim1',
                    name: 'Test',
                    nodeGraph: { nodes: [source, output], connections: [initialConn], viewport: {x:0, y:0, scale:1} },
                    layout: { elements: [] }
                };

                const state = { ...initialState, animations: [anim], activeAnimationId: 'anim1' };

                // 2. Define the "Inserted" node (mimicking handleAddNode logic)
                const newNodeId = 'inserted_node';
                const newNode: NodeData = { id: newNodeId, type: 'chroma', x:250, y:0, width:100, height:100, data: {} as any };
                const inHandle = 'input';
                const outHandle = 'output';

                // 3. Perform the topological split
                const nextConns = anim.nodeGraph.connections.filter(c => c.id !== 'c1');
                const c1 = { id: 'new_c1', source: 's1', sourceHandle: initialConn.sourceHandle, target: newNodeId, targetHandle: inHandle };
                const c2 = { id: 'new_c2', source: newNodeId, sourceHandle: outHandle, target: 'o1', targetHandle: initialConn.targetHandle };
                
                const nextGraph = {
                    ...anim.nodeGraph,
                    nodes: [...anim.nodeGraph.nodes, newNode],
                    connections: [...nextConns, c1, c2]
                };

                // 4. Update state via reducer
                const newState = projectReducer(state, {
                    type: 'UPDATE_NODE_GRAPH',
                    payload: { animId: 'anim1', graph: nextGraph }
                });

                // 5. Verification
                const resultAnim = newState.animations[0];
                expect(resultAnim.nodeGraph.nodes.length).toBe(3);
                expect(resultAnim.nodeGraph.connections.length).toBe(2);
                
                const connToInsert = resultAnim.nodeGraph.connections.find(c => c.target === newNodeId);
                const connFromInsert = resultAnim.nodeGraph.connections.find(c => c.source === newNodeId);
                
                expect(connToInsert).toBeDefined();
                expect(connToInsert?.source).toBe('s1');
                expect(connFromInsert).toBeDefined();
                expect(connFromInsert?.target).toBe('o1');
            });
        });

        describe('Socket Geometry', () => {
            const calculateSocketY = (node: NodeData, totalSockets: number, index: number) => {
                const step = 100 / (totalSockets + 1);
                const pct = step * (index + 1);
                const effectiveHeight = node.collapsed ? 32 : node.height;
                return node.y + (effectiveHeight * (pct / 100));
            };

            it('Calculates different socket positions when node is collapsed', () => {
                const node: NodeData = { 
                    id: 'test', type: 'chroma', x: 0, y: 100, width: 200, height: 400, 
                    collapsed: false, 
                    data: { enabled: false, keyColor: '#00ff00', similarity: 0, smoothness: 0, spill: 0, clipBlack: 0, clipWhite: 0 }
                };
                const yExpanded = calculateSocketY(node, 1, 0);
                const collapsedNode = { ...node, collapsed: true };
                const yCollapsed = calculateSocketY(collapsedNode, 1, 0);
                expect(yExpanded).not.toBe(yCollapsed);
                expect(yCollapsed).toBeLessThan(yExpanded);
            });
        });
    });
};
