import { FrameSkipNode } from './FrameSkipNode';
import { processFrameSkip } from './frameSkip';
import { NodeBundle } from '../index';
import { FastForward } from 'lucide-react';

export const FrameSkipBundle: NodeBundle = {
    type: 'frame_skip',
    title: 'Decimate Frames',
    component: FrameSkipNode,
    processor: processFrameSkip,
    icon: FastForward,
    colorClass: 'bg-indigo-500',
    io: {
        inputs: {
            input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE']
        },
        outputs: {
            output: ['IMAGE_SEQUENCE', 'TIMELINE', 'IMAGE']
        }
    }
};
