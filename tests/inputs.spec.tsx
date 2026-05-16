import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Slider } from '../components/common/design-system/Slider';
import { NumberInput } from '../components/common/design-system/NumberInput';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const afterEach: any;

export const defineInputsSpecs = () => {
    describe('Driven State UI Inputs', () => {
        let container: HTMLDivElement;
        let root: any;

        beforeEach(() => {
            container = document.createElement('div');
            document.body.appendChild(container);
            root = createRoot(container);
        });

        afterEach(() => {
            root.unmount();
            container.remove();
            container = undefined as any;
        });

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        it('Slider ignores prop updates while being interacted with', async () => {
            let lastEmittedValue = 0;
            
            const TestComponent = ({ forceValue }: { forceValue: number }) => {
                return (
                    <Slider 
                        label="Test"
                        min={0} max={100}
                        value={forceValue}
                        onChange={(v) => { lastEmittedValue = v; }}
                        debounceTime={50}
                    />
                );
            };

            root.render(<TestComponent forceValue={10} />);
            await wait(20);

            const rangeInput = container.querySelector('input[type="range"]') as HTMLInputElement;
            expect(rangeInput).toBeDefined();
            expect(rangeInput.value).toBe("10");

            // Simulate Pointer Down (start interaction)
            const downEvent = new MouseEvent('pointerdown', { bubbles: true }) as any;
            downEvent.pointerId = 1;
            // mock capture
            rangeInput.setPointerCapture = () => {};
            rangeInput.releasePointerCapture = () => {};
            
            rangeInput.dispatchEvent(downEvent);

            // Change input locally (e.g., user dragging)
            const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            valueSetter?.call(rangeInput, "45");
            rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
            rangeInput.dispatchEvent(new Event('change', { bubbles: true }));

            await wait(20);

            // Expect local value to be 45 still, even though prop is 10
            expect(rangeInput.value).toBe("45");

            // Now some external force changes the prop to 20
            root.render(<TestComponent forceValue={20} />);
            await wait(20);

            // Because we are interacting, it should NOT jump to 20!
            expect(rangeInput.value).toBe("45");

            // Stop interacting
            const upEvent = new MouseEvent('pointerup', { bubbles: true }) as any;
            upEvent.pointerId = 1;
            rangeInput.dispatchEvent(upEvent);

            await wait(20);

            // External prop changes AGAIN to 30 while NOT interacting
            root.render(<TestComponent forceValue={30} />);
            await wait(20);

            // Now it SHOULD update to 30
            expect(rangeInput.value).toBe("30");
        });

        it('NumberInput ignores prop updates while focused', async () => {
            const TestComponent = ({ forceValue }: { forceValue: number }) => {
                return (
                    <NumberInput 
                        label="NumTest"
                        value={forceValue}
                        onChange={() => {}}
                        debounceTime={50}
                    />
                );
            };

            root.render(<TestComponent forceValue={5} />);
            await wait(20);

            const input = container.querySelector('input[type="number"]') as HTMLInputElement;
            expect(input.value).toBe("5");

            // Focus
            input.focus();
            input.dispatchEvent(new Event('focus', { bubbles: true }));
            input.dispatchEvent(new Event('focusin', { bubbles: true }));
            
            // Type local
            const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            valueSetter?.call(input, "99");
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Props change to 10
            root.render(<TestComponent forceValue={10} />);
            await wait(20);

            // Should remain 99 because focused
            expect(input.value).toBe("99");

            // Blur
            input.blur();
            input.dispatchEvent(new Event('blur', { bubbles: true }));
            input.dispatchEvent(new Event('focusout', { bubbles: true }));
            await wait(20);

            // Props change to 15
            root.render(<TestComponent forceValue={15} />);
            await wait(20);

            // Should be 15
            expect(input.value).toBe("15");
        });
    });
};
