
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ImageSource } from '../../types';

// Workaround for R3F IntrinsicElements TypeScript issues
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const Mesh = 'mesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const PlaneGeometry = 'planeGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;

interface NormalMapPreviewProps {
  imageSrc: ImageSource;
  normalMapSrc: ImageSource;
  lightIntensity?: number;
  lightZ?: number;
  showDiffuse?: boolean;
}

// --- Internal Scene Components ---

const LightingController = ({ z, intensity }: { z: number, intensity: number }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    const sphereRef = useRef<THREE.Mesh>(null);
    
    const viewport = useThree((state) => state.viewport);

    useFrame((state) => {
        // Map normalized mouse (-1..1) to viewport dimensions
        const x = (state.mouse.x * viewport.width) / 2;
        const y = (state.mouse.y * viewport.height) / 2;

        // SCALING FIX: 
        // Since we switched to zoom={1} (1 unit = 1 pixel), the viewport dimensions are now in pixels (e.g., 200x200).
        // The 'z' prop from the slider is small (e.g., 2.0). 
        // We must scale the Z position relative to the viewport size so the light isn't "inside" the mesh.
        // A factor of 25 provides a good feel (Z=2 becomes 50px distance).
        const scaleFactor = Math.min(viewport.width, viewport.height) / 5; 
        const actualZ = z * Math.max(10, scaleFactor);

        if (lightRef.current) {
            lightRef.current.position.set(x, y, actualZ);
        }
        if (sphereRef.current) {
            sphereRef.current.position.set(x, y, actualZ);
        }
    });

    return (
        <>
            <PointLight 
                ref={lightRef} 
                position={[0, 0, 100]} // Initial pos
                intensity={intensity} 
                decay={0.5}
                distance={2000} // Increased distance for pixel-space coordinates
                color="#ffffff"
            />
            {/* Visual helper for the light source */}
            <Mesh ref={sphereRef} position={[0,0,100]}>
                <SphereGeometry args={[4, 16, 16]} /> 
                <MeshBasicMaterial color="yellow" />
            </Mesh>
        </>
    );
};

const SpritePlane = ({ 
    imageSrc, 
    normalMapSrc, 
    showDiffuse 
}: { 
    imageSrc: ImageSource, 
    normalMapSrc: ImageSource, 
    showDiffuse: boolean 
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const viewport = useThree((state) => state.viewport);

    // Texture Loader hook-equivalent
    const { diffMap, normMap, ratio } = useMemo(() => {
        const loadTex = (src: ImageSource, isColor: boolean) => {
            const tex = new THREE.Texture();
            
            // PIXEL ART SETTINGS
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            
            // ORIENTATION FIX:
            tex.flipY = false; 

            // COLOR SPACE CRITICAL FIX:
            if (isColor) {
                tex.colorSpace = THREE.SRGBColorSpace;
            } else {
                tex.colorSpace = THREE.NoColorSpace; // Linear
            }

            if (typeof src === 'string') {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => { tex.image = img; tex.needsUpdate = true; };
                img.src = src;
            } else if (src instanceof ImageBitmap) {
                tex.image = src;
                tex.needsUpdate = true;
            }
            return tex;
        };

        const dMap = loadTex(imageSrc, true);
        const nMap = loadTex(normalMapSrc, false);
        
        let r = 1;
        if (imageSrc instanceof ImageBitmap) {
            r = imageSrc.width / imageSrc.height;
        }

        return { diffMap: dMap, normMap: nMap, ratio: r };
    }, [imageSrc, normalMapSrc]);

    // Update ratio dynamically if texture loads later (for string sources)
    const [aspect, setAspect] = useState(1);
    useEffect(() => {
        if (imageSrc instanceof ImageBitmap) {
            setAspect(imageSrc.width / imageSrc.height);
        } else {
            const i = new Image();
            i.onload = () => setAspect(i.naturalWidth / i.naturalHeight);
            i.src = imageSrc as string;
        }
    }, [imageSrc]);

    // Responsive Fit Logic (Contain)
    const padding = 0.9; // 90% fill
    const vpRatio = viewport.width / viewport.height;
    
    let scaleX = 1;
    let scaleY = 1;

    if (vpRatio > aspect) {
        // Viewport is wider -> fit by height
        scaleY = viewport.height * padding;
        scaleX = scaleY * aspect;
    } else {
        // Viewport is taller -> fit by width
        scaleX = viewport.width * padding;
        scaleY = scaleX / aspect;
    }

    return (
        <Mesh 
            ref={meshRef} 
            // Scale Y by -1 to flip the sprite upright (correcting WebGL (0,0) vs Image (0,0))
            scale={[scaleX, -scaleY, 1]} 
        >
            <PlaneGeometry args={[1, 1]} />
            <MeshStandardMaterial 
                map={showDiffuse ? diffMap : null}
                normalMap={normMap}
                // INVERT X NORMAL to fix "Back Part" look
                normalScale={new THREE.Vector2(-1, 1)} 
                color={showDiffuse ? "white" : "#808080"}
                roughness={0.4}
                metalness={0.1}
                transparent={true}
                side={THREE.DoubleSide} 
            />
        </Mesh>
    );
};

const NormalMapPreview: React.FC<NormalMapPreviewProps> = ({ 
    imageSrc, 
    normalMapSrc, 
    lightIntensity = 1.5,
    lightZ = 2.0,
    showDiffuse = true
}) => {
  return (
    <div className="w-full h-full relative group bg-[#050505] checkerboard">
        {/* 
            CRITICAL FIX: 
            Use zoom={1} (Default) instead of 50. 
            This ensures 1 R3F Unit = 1 CSS Pixel.
            This prevents the "Tiny/Huge" scaling issues when the parent container 
            is transformed via CSS scale() (Zooming the Node Graph).
        */}
        <Canvas 
            orthographic
            camera={{ zoom: 1, position: [0, 0, 1000] }} 
            className="cursor-none"
            dpr={1} 
            gl={{ antialias: false, preserveDrawingBuffer: true }}
            resize={{ scroll: false, offsetSize: true }} // Force resize observer to use offset dimensions
        >
            <AmbientLight intensity={0.2} />
            <LightingController z={lightZ} intensity={lightIntensity} />
            <SpritePlane 
                imageSrc={imageSrc} 
                normalMapSrc={normalMapSrc} 
                showDiffuse={showDiffuse} 
            />
        </Canvas>
        
        <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
             <span className="text-[10px] font-mono text-gray-400 bg-black/80 px-2 py-1 rounded border border-white/10">
                Mouse controls light position
             </span>
        </div>
    </div>
  );
};

export default NormalMapPreview;
