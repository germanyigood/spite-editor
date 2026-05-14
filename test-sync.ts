import { syncTimelineToGrid } from './utils/graph';
import { TimelineNode, GridNode, NodeData, Connection } from './types';

const grid: any = { 
    id: 'grid1', type: 'grid', x:0, y:0, width:100, height:100, 
    data: { totalFrames: 3, autoUpdateTimeline: true } 
};
const timeline: any = {
    id: 'tl1', type: 'timeline', x:0, y:0, width:100, height:100,
    data: { frames: [2, 0, 1], fps:12, loop:true, isPlaying:false, currentFrame:0 }
};
const source: any = { 
    id: 'src1', type: 'source', x:0, y:0, width:100, height:100, data: { name: 'S1', width:100, height:100 } 
};
const nodes = [source, grid, timeline];
const connections: Connection[] = [
    { id: 'c1', source: 'src1', target: 'grid1' },
    { id: 'c2', source: 'grid1', target: 'tl1' }
];

console.log("Timeline initially: ", timeline.data.frames);
const updatedNodes = syncTimelineToGrid(nodes as any, connections);
const tlNode = updatedNodes.find(n => n.id === 'tl1') as any;
console.log("Timeline after sync: ", tlNode.data.frames);
